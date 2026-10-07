import {
  AmbientLight,
  Box2,
  Box3,
  Color,
  Group,
  DirectionalLight,
  HemisphereLight,
  Mesh,
  NoToneMapping,
  OrthographicCamera,
  PlaneGeometry,
  Raycaster,
  Scene,
  ShaderMaterial,
  SRGBColorSpace,
  Vector2,
  Vector3,
  WebGLRenderer,
} from "three";
import { QualityManager } from "../landing/QualityManager";
import { EarthInteraction } from "./interaction";
import { loadPhotographicEarth, disposeEarthObjects } from "./model";
import { DinosaurReveal } from "./DinosaurReveal";
import { EARTH_VIEW_EXTENT } from "./entities";
import { hitsVisibleEntity, projectBounds } from "./selection";

interface EarthActions {
  fallback(): void;
  activateDinosaur(): void;
  dinosaurControl: HTMLButtonElement;
}

/** One scene, one canvas and one clock; the museum's game runtimes are independent. */
export class FloatingEarthWorld {
  private renderer: WebGLRenderer;
  private scene = new Scene();
  private camera = new OrthographicCamera(-EARTH_VIEW_EXTENT, EARTH_VIEW_EXTENT, EARTH_VIEW_EXTENT, -EARTH_VIEW_EXTENT, 0.1, 20);
  private floating = new Group();
  private rotation = new Group();
  private pose = new Group();
  private entityLayer = new Group();
  private dinosaur?: DinosaurReveal;
  private earth?: Group;
  private ray = new Raycaster();
  private pointerPosition = new Vector2();
  private cameraForward = new Vector3();
  private entityBounds = new Box3();
  private projectedBounds = new Box2();
  private dinosaurPressed = false;
  private entering = false;
  private hoverTime = 0;
  private interaction = new EarthInteraction();
  private motion = window.matchMedia("(prefers-reduced-motion: reduce)");
  private quality = new QualityManager({
    mobile: window.matchMedia("(pointer: coarse)").matches,
    cores: navigator.hardwareConcurrency,
    // The photographic globe remains interactive on small devices with reduced motion.
    reducedMotion: false,
  });
  private observer: ResizeObserver;
  private frame = 0;
  private lastTime = 0;
  private elapsed = 0;
  private autoYaw = 0;
  private pointer: number | null = null;
  private ready = false;
  private disposed = false;
  private shaderFailed = false;

  static async create(
    canvas: HTMLCanvasElement,
    control: HTMLButtonElement,
    root: HTMLElement,
    signal: AbortSignal,
    actions: EarthActions,
  ) {
    const world = new FloatingEarthWorld(canvas, control, root, actions);
    try {
      const earth = await loadPhotographicEarth(signal);
      if (world.disposed) {
        FloatingEarthWorld.disposeObjects(earth);
        throw new Error("Earth rendering ended while loading");
      }
      world.pose.add(earth);
      world.earth = earth;
      if (signal.aborted) throw new Error("Earth loading cancelled");
      world.renderer.compile(world.scene, world.camera);
      if (world.shaderFailed) throw new Error("Earth material unavailable");
      world.ready = true;
      world.resize();
      world.render();
      if (world.disposed) throw new Error("Earth rendering unavailable");
      world.root.dataset.earthReady = "true";
      world.root.dataset.earthObject = earth.uuid;
      world.beginDinosaurReveal();
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
    private actions: EarthActions,
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
    this.pose.rotation.set(12 * Math.PI / 180, 100 * Math.PI / 180, 0, "XYZ");
    this.rotation.rotation.order = "YXZ";
    this.pose.name = "EarthRoot";
    this.entityLayer.name = "EntityLayer";
    this.pose.add(this.entityLayer);
    this.rotation.add(this.pose);
    this.floating.add(this.rotation, this.createHalo());
    this.scene.add(this.floating);
    const sunlight = new DirectionalLight("#e9f1f5", 2.2);
    sunlight.position.set(-0.38, 0.4, 0.84);
    this.scene.add(sunlight, new HemisphereLight("#bddce6", "#294754", 1.3), new AmbientLight("#ffffff", 2.4));
    this.observer = new ResizeObserver(this.resize);
    this.observer.observe(control);
    this.canvas.addEventListener("webglcontextlost", this.contextLost);
    control.addEventListener("pointerdown", this.pointerDown);
    control.addEventListener("pointermove", this.pointerMove);
    control.addEventListener("pointerup", this.pointerUp);
    control.addEventListener("pointercancel", this.pointerCancel);
    control.addEventListener("pointerleave", this.pointerLeave);
    control.addEventListener("lostpointercapture", this.pointerCancel);
    control.addEventListener("click", this.click);
    control.addEventListener("keydown", this.keyDown);
    control.addEventListener("blur", this.cancelInput);
    root.addEventListener("wheel", this.wheel, { passive: false });
    window.addEventListener("blur", this.cancelInput);
    document.addEventListener("visibilitychange", this.visibilityChange);
    this.motion.addEventListener("change", this.motionChange);
    this.motionChange();
    this.visibilityChange();
  }

  private beginDinosaurReveal() {
    this.dinosaur = new DinosaurReveal();
    this.entityLayer.add(this.dinosaur.object3D);
    void this.dinosaur.load().catch(() => {
      // Optional asset loading cannot turn the Earth into a static fallback.
    });
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
          // Broaden the atmospheric light and fade it before the canvas boundary.
          float edge = exp(-pow((r - 1.012) * 90.0, 2.0));
          float glow = exp(-max(r - 1.008, 0.0) * 19.0) * 0.72;
          float outer = 1.0 - smoothstep(1.07, 1.125, r);
          gl_FragColor = vec4(mix(blue, cyan, edge), (edge * 1.1 + glow) * outer);
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
    this.camera.left = -EARTH_VIEW_EXTENT * aspect;
    this.camera.right = EARTH_VIEW_EXTENT * aspect;
    this.camera.updateProjectionMatrix();
    this.root.dataset.quality = this.quality.tier;
    this.root.dataset.earthDiameter = (width / EARTH_VIEW_EXTENT).toFixed(2);
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
    this.autoYaw = (this.autoYaw + delta * 0.035) % (Math.PI * 2);
    this.interaction.update(delta);
    this.dinosaur?.update(Math.min(rawDelta, 0.25), this.motion.matches, this.renderer.getPixelRatio());
    if (!this.motion.matches) this.floating.position.y = Math.sin(this.elapsed * 0.85) * 0.022;
    if (this.quality.sample(rawDelta)) {
      if (this.quality.tier === "static") { this.fail(); return; }
      this.resize();
    }
    this.render();
    this.requestFrame();
  };

  private render() {
    const yaw = this.autoYaw + this.interaction.yaw;
    this.rotation.rotation.set(this.interaction.pitch, yaw, 0, "YXZ");
    this.root.dataset.earthYaw = yaw.toFixed(5);
    this.root.dataset.earthPitch = this.interaction.pitch.toFixed(5);
    if (this.dinosaur) {
      this.root.dataset.dinosaurState = this.dinosaur.state;
      this.root.dataset.dinosaurSource = this.dinosaur.source;
      this.camera.getWorldDirection(this.cameraForward);
      this.dinosaur.updateVisibility(this.cameraForward);
    }
    this.renderer.render(this.scene, this.camera);
    this.updateDinosaurControl();
    if (this.shaderFailed) this.fail();
  }

  private updateDinosaurControl() {
    const button = this.actions.dinosaurControl;
    const visible = !this.entering && this.dinosaur?.state === "settled"
      && this.dinosaur.object3D.visible;
    button.hidden = !visible;
    button.disabled = !visible;
    if (!visible || !this.dinosaur) return;
    projectBounds(this.dinosaur.getWorldBounds(this.entityBounds), this.camera, this.projectedBounds);
    const rect = this.canvas.getBoundingClientRect();
    const space = this.control.parentElement!.getBoundingClientRect();
    const { min, max } = this.projectedBounds;
    button.style.left = `${rect.left - space.left + (min.x + 1) * rect.width / 2 - 5}px`;
    button.style.top = `${rect.top - space.top + (1 - max.y) * rect.height / 2 - 5}px`;
    button.style.width = `${Math.max(24, (max.x - min.x) * rect.width / 2 + 10)}px`;
    button.style.height = `${Math.max(24, (max.y - min.y) * rect.height / 2 + 10)}px`;
  }

  private picksDinosaur(event: PointerEvent) {
    if (this.entering || this.dinosaur?.state !== "settled" || !this.earth) return false;
    this.scene.updateMatrixWorld(true);
    this.camera.getWorldDirection(this.cameraForward);
    if (!this.dinosaur.isFrontFacing(this.cameraForward)) return false;
    const rect = this.canvas.getBoundingClientRect();
    this.pointerPosition.set((event.clientX - rect.left) / rect.width * 2 - 1,
      1 - (event.clientY - rect.top) / rect.height * 2);
    this.ray.setFromCamera(this.pointerPosition, this.camera);
    return hitsVisibleEntity(this.ray, this.dinosaur.entityRoot, this.earth);
  }

  private wheel = (event: WheelEvent) => {
    if (!this.ready || this.entering || event.ctrlKey || event.target instanceof Element && event.target.closest("a")) return;
    event.preventDefault();
    const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? this.control.clientHeight : 1;
    const movement = (event.deltaY || event.deltaX) * unit;
    this.interaction.rotate(Math.max(-0.4, Math.min(0.4, movement * 0.002)), 0);
    this.requestFrame();
  };

  private pointerDown = (event: PointerEvent) => {
    if (!this.ready || this.entering || !event.isPrimary || event.button !== 0 || this.pointer !== null) return;
    this.pointer = event.pointerId;
    this.interaction.begin(event.clientX, event.clientY, event.timeStamp / 1000);
    this.dinosaurPressed = this.picksDinosaur(event);
    this.control.setPointerCapture(event.pointerId);
    this.root.dataset.dragging = "true";
    this.requestFrame();
  };

  private pointerMove = (event: PointerEvent) => {
    if (this.pointer === null) {
      if (event.pointerType !== "touch" && event.timeStamp - this.hoverTime > 50) {
        this.hoverTime = event.timeStamp;
        this.control.style.cursor = this.picksDinosaur(event) ? "pointer" : "";
      }
      return;
    }
    if (event.pointerId !== this.pointer) return;
    this.interaction.move(event.clientX, event.clientY, event.timeStamp / 1000, this.control.clientWidth / EARTH_VIEW_EXTENT);
    this.requestFrame();
  };

  private pointerUp = (event: PointerEvent) => {
    if (event.pointerId !== this.pointer) return;
    // Include the last sample even on devices that coalesce the final move.
    this.pointerMove(event);
    const activate = this.dinosaurPressed && !this.interaction.dragging && this.picksDinosaur(event);
    if (activate) this.interaction.cancel();
    else this.interaction.end(event.timeStamp / 1000);
    this.releasePointer();
    if (activate) {
      this.entering = true;
      this.actions.activateDinosaur();
    }
    this.requestFrame();
  };

  private pointerLeave = () => { if (this.pointer === null) this.control.style.cursor = ""; };

  private pointerCancel = (event: PointerEvent) => {
    if (event.pointerId === this.pointer) this.cancelInput();
  };

  private releasePointer() {
    const pointer = this.pointer;
    this.pointer = null;
    this.dinosaurPressed = false;
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
      case "Home": this.interaction.reset(); this.autoYaw = 0; break;
      default: return;
    }
    event.preventDefault();
    this.requestFrame();
  };

  private contextLost = (event: Event) => { event.preventDefault(); this.fail(); };

  private fail() {
    if (this.disposed) return;
    this.dispose();
    this.actions.fallback();
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
    this.control.removeEventListener("pointerleave", this.pointerLeave);
    this.control.removeEventListener("lostpointercapture", this.pointerCancel);
    this.control.removeEventListener("click", this.click);
    this.control.removeEventListener("keydown", this.keyDown);
    this.control.removeEventListener("blur", this.cancelInput);
    this.root.removeEventListener("wheel", this.wheel);
    this.actions.dinosaurControl.hidden = true;
    this.actions.dinosaurControl.disabled = true;
    this.dinosaur?.dispose();
    FloatingEarthWorld.disposeObjects(this.scene);
    this.renderer.dispose();
  }

  private static disposeObjects(group: Group | Scene) {
    disposeEarthObjects(group);
  }
}
