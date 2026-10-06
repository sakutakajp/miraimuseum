import {
  Color,
  Group,
  Mesh,
  NoToneMapping,
  OrthographicCamera,
  PlaneGeometry,
  Scene,
  ShaderMaterial,
  SRGBColorSpace,
  WebGLRenderer,
} from "three";
import { QualityManager } from "../landing/QualityManager";
import { EarthInteraction } from "./interaction";
import { loadLowPolyEarth } from "./model";

/** One scene, one canvas and one clock; the museum's game runtimes are independent. */
export class FloatingEarthWorld {
  private renderer: WebGLRenderer;
  private scene = new Scene();
  private camera = new OrthographicCamera(-1.13, 1.13, 1.13, -1.13, 0.1, 20);
  private floating = new Group();
  private rotation = new Group();
  private pose = new Group();
  private interaction = new EarthInteraction();
  private motion = window.matchMedia("(prefers-reduced-motion: reduce)");
  private quality = new QualityManager({
    mobile: window.matchMedia("(pointer: coarse)").matches,
    cores: navigator.hardwareConcurrency,
    // A low-poly globe remains interactive on small devices with reduced motion.
    reducedMotion: false,
  });
  private observer: ResizeObserver;
  private frame = 0;
  private lastTime = 0;
  private elapsed = 0;
  private pointer: number | null = null;
  private ready = false;
  private disposed = false;
  private shaderFailed = false;

  static async create(
    canvas: HTMLCanvasElement,
    control: HTMLButtonElement,
    root: HTMLElement,
    signal: AbortSignal,
    fallback: () => void,
  ) {
    const world = new FloatingEarthWorld(canvas, control, root, fallback);
    try {
      const earth = await loadLowPolyEarth(signal);
      if (world.disposed) {
        FloatingEarthWorld.disposeObjects(earth);
        throw new Error("Earth rendering ended while loading");
      }
      world.pose.add(earth);
      if (signal.aborted) throw new Error("Earth loading cancelled");
      world.renderer.compile(world.scene, world.camera);
      if (world.shaderFailed) throw new Error("Earth material unavailable");
      world.ready = true;
      world.resize();
      world.render();
      if (world.disposed) throw new Error("Earth rendering unavailable");
      world.root.dataset.earthReady = "true";
      world.root.dataset.earthObject = earth.uuid;
      world.requestFrame();
      return world;
    } catch (error) {
      world.dispose();
      throw error;
    }
  }

  private constructor(
    private canvas: HTMLCanvasElement,
    private control: HTMLButtonElement,
    private root: HTMLElement,
    private fallback: () => void,
  ) {
    const context = canvas.getContext("webgl2", {
      antialias: true,
      alpha: true,
      powerPreference: "low-power",
    });
    if (!context) throw new Error("Earth rendering unavailable");
    this.renderer = new WebGLRenderer({ canvas, context, antialias: true, alpha: true });
    this.renderer.outputColorSpace = SRGBColorSpace;
    this.renderer.toneMapping = NoToneMapping;
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.debug.onShaderError = () => { this.shaderFailed = true; };
    this.camera.position.z = 5;
    this.pose.rotation.set(30 * Math.PI / 180, 100 * Math.PI / 180, 0, "XYZ");
    this.rotation.rotation.order = "YXZ";
    this.rotation.add(this.pose);
    this.floating.add(this.rotation, this.createHalo());
    this.scene.add(this.floating);
    this.observer = new ResizeObserver(this.resize);
    this.observer.observe(control);
    this.canvas.addEventListener("webglcontextlost", this.contextLost);
    control.addEventListener("pointerdown", this.pointerDown);
    control.addEventListener("pointermove", this.pointerMove);
    control.addEventListener("pointerup", this.pointerUp);
    control.addEventListener("pointercancel", this.pointerCancel);
    control.addEventListener("lostpointercapture", this.pointerCancel);
    control.addEventListener("click", this.click);
    control.addEventListener("keydown", this.keyDown);
    control.addEventListener("blur", this.cancelInput);
    window.addEventListener("blur", this.cancelInput);
    document.addEventListener("visibilitychange", this.visibilityChange);
    this.motion.addEventListener("change", this.motionChange);
    this.motionChange();
    this.visibilityChange();
  }

  private createHalo() {
    const halo = new Mesh(new PlaneGeometry(2.5, 2.5), new ShaderMaterial({
      transparent: true,
      depthWrite: false,
      toneMapped: false,
      uniforms: {
        blue: { value: new Color("#0759ff") },
        cyan: { value: new Color("#5eeaff") },
      },
      vertexShader: `varying vec2 vUv;
        void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `varying vec2 vUv; uniform vec3 blue; uniform vec3 cyan;
        void main() {
          float r = length(vUv - 0.5) * 2.5;
          float edge = exp(-pow((r - 1.012) * 125.0, 2.0));
          float glow = exp(-max(r - 1.008, 0.0) * 39.0) * 0.35;
          float outer = 1.0 - smoothstep(1.06, 1.19, r);
          gl_FragColor = vec4(mix(blue, cyan, edge), (edge * 0.88 + glow) * outer);
          #include <colorspace_fragment>
        }`,
    }));
    halo.position.z = -1.2;
    halo.renderOrder = -1;
    return halo;
  }

  private resize = () => {
    if (this.disposed) return;
    const { width, height } = this.control.getBoundingClientRect();
    if (width < 1 || height < 1) return;
    this.renderer.setPixelRatio(this.quality.pixelRatio(window.devicePixelRatio));
    this.renderer.setSize(Math.round(width), Math.round(height), false);
    const aspect = width / height;
    this.camera.left = -1.13 * aspect;
    this.camera.right = 1.13 * aspect;
    this.camera.updateProjectionMatrix();
    this.root.dataset.quality = this.quality.tier;
    this.requestFrame();
  };

  private motionChange = () => {
    this.interaction.setReducedMotion(this.motion.matches);
    this.root.dataset.motion = this.motion.matches ? "reduced" : "full";
    if (this.motion.matches) this.floating.position.y = 0;
    this.requestFrame();
  };

  private visibilityChange = () => {
    this.root.dataset.suspended = String(document.hidden);
    this.lastTime = 0;
    this.quality.resetWindow();
    if (document.hidden) {
      this.cancelInput();
      cancelAnimationFrame(this.frame);
      this.frame = 0;
    } else this.requestFrame();
  };

  private requestFrame() {
    if (!this.ready || this.disposed || this.frame || document.hidden) return;
    this.frame = requestAnimationFrame(this.tick);
  }

  private tick = (time: number) => {
    this.frame = 0;
    if (this.disposed || document.hidden) return;
    const rawDelta = this.lastTime ? (time - this.lastTime) / 1000 : 0;
    const delta = Math.min(rawDelta, 0.05);
    this.lastTime = time;
    this.elapsed += delta;
    this.interaction.update(delta);
    if (!this.motion.matches) this.floating.position.y = Math.sin(this.elapsed * 0.85) * 0.022;
    if (this.quality.sample(rawDelta)) {
      if (this.quality.tier === "static") { this.fail(); return; }
      this.resize();
    }
    this.render();
    if (!this.motion.matches || this.interaction.moving) this.requestFrame();
    else this.lastTime = 0;
  };

  private render() {
    this.rotation.rotation.set(this.interaction.pitch, this.interaction.yaw, 0, "YXZ");
    this.root.dataset.earthYaw = this.interaction.yaw.toFixed(5);
    this.root.dataset.earthPitch = this.interaction.pitch.toFixed(5);
    this.renderer.render(this.scene, this.camera);
    if (this.shaderFailed) this.fail();
  }

  private pointerDown = (event: PointerEvent) => {
    if (!this.ready || !event.isPrimary || event.button !== 0 || this.pointer !== null) return;
    this.pointer = event.pointerId;
    this.interaction.begin(event.clientX, event.clientY, event.timeStamp / 1000);
    this.control.setPointerCapture(event.pointerId);
    this.root.dataset.dragging = "true";
    this.requestFrame();
  };

  private pointerMove = (event: PointerEvent) => {
    if (event.pointerId !== this.pointer) return;
    this.interaction.move(event.clientX, event.clientY, event.timeStamp / 1000, this.control.clientWidth * 0.885);
    this.requestFrame();
  };

  private pointerUp = (event: PointerEvent) => {
    if (event.pointerId !== this.pointer) return;
    // Include the last sample even on devices that coalesce the final move.
    this.pointerMove(event);
    this.interaction.end(event.timeStamp / 1000);
    this.releasePointer();
    this.requestFrame();
  };

  private pointerCancel = (event: PointerEvent) => {
    if (event.pointerId === this.pointer) this.cancelInput();
  };

  private releasePointer() {
    const pointer = this.pointer;
    this.pointer = null;
    this.root.dataset.dragging = "false";
    if (pointer !== null && this.control.hasPointerCapture(pointer)) this.control.releasePointerCapture(pointer);
  }

  private cancelInput = () => {
    this.interaction.cancel();
    this.releasePointer();
    this.requestFrame();
  };

  private click = (event: MouseEvent) => {
    // Native keyboard/assistive activation; pointer taps are handled on release.
    if (event.detail === 0) { this.interaction.tap(); this.requestFrame(); }
  };

  private keyDown = (event: KeyboardEvent) => {
    if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home"].includes(event.key)) this.releasePointer();
    const step = event.shiftKey ? 0.32 : 0.16;
    switch (event.key) {
      case "ArrowLeft": this.interaction.rotate(-step, 0); break;
      case "ArrowRight": this.interaction.rotate(step, 0); break;
      case "ArrowUp": this.interaction.rotate(0, -step); break;
      case "ArrowDown": this.interaction.rotate(0, step); break;
      case "Home": this.interaction.reset(); break;
      default: return;
    }
    event.preventDefault();
    this.requestFrame();
  };

  private contextLost = (event: Event) => { event.preventDefault(); this.fail(); };

  private fail() {
    if (this.disposed) return;
    this.dispose();
    this.fallback();
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    cancelAnimationFrame(this.frame);
    this.releasePointer();
    this.observer.disconnect();
    this.motion.removeEventListener("change", this.motionChange);
    document.removeEventListener("visibilitychange", this.visibilityChange);
    window.removeEventListener("blur", this.cancelInput);
    this.canvas.removeEventListener("webglcontextlost", this.contextLost);
    this.control.removeEventListener("pointerdown", this.pointerDown);
    this.control.removeEventListener("pointermove", this.pointerMove);
    this.control.removeEventListener("pointerup", this.pointerUp);
    this.control.removeEventListener("pointercancel", this.pointerCancel);
    this.control.removeEventListener("lostpointercapture", this.pointerCancel);
    this.control.removeEventListener("click", this.click);
    this.control.removeEventListener("keydown", this.keyDown);
    this.control.removeEventListener("blur", this.cancelInput);
    FloatingEarthWorld.disposeObjects(this.scene);
    this.renderer.dispose();
  }

  private static disposeObjects(group: Group | Scene) {
    group.traverse((object) => {
      if (!(object instanceof Mesh)) return;
      object.geometry.dispose();
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      materials.forEach((material) => material.dispose());
    });
  }
}
