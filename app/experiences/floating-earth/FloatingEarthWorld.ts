import { Camera, Color3, DirectionalLight, FreeCamera, HemisphericLight, HighlightLayer, Matrix, Mesh, MeshBuilder, PBRMaterial, Quaternion, RawCubeTexture, ShaderMaterial, TransformNode, Vector3, VertexData } from "@babylonjs/core";
import { SceneRuntime, runtimeResources } from "../../three-d/runtime";
import { SceneAssets, assetCacheBytes, instantiateModel } from "../../three-d/assets";
import { readSettings, type Quality } from "../../three-d/settings";
import { CYBERTRUCK, DINOSAUR, EARTH_DISPLAY_EXTENT, EARTH_VIEW_EXTENT, INITIAL_EARTH_POSE, STATUE, surfaceOrientation } from "./entities";
import { EarthInteraction } from "./interaction";
import { photographicEarth } from "./earth-material";
import { revealAt } from "./reveal";
import type { CybertruckEntry } from "./cybertruck-unlock";

interface Options {
  fallback(): void; activateDinosaur(): void; dinosaurControl: HTMLButtonElement;
  cybertruckEntry: CybertruckEntry; cybertruckControl: HTMLButtonElement;
  activateCybertruck(): void; cybertruckAppeared(): void;
}
type Exhibit = { id: string; anchor: TransformNode; model: ReturnType<typeof instantiateModel>; normal: Vector3; column: Mesh; light: ShaderMaterial; opacity: number; phase: string; radius: number };
export class FloatingEarthWorld {
  readonly runtime: SceneRuntime;
  readonly assets: SceneAssets;
  readonly interaction = new EarthInteraction();
  readonly earth: TransformNode;
  private camera: FreeCamera;
  private highlights: HighlightLayer;
  private exhibits: Exhibit[] = [];
  private reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  private elapsed = 0;
  private autoYaw = 0;
  private orbitAngle = 0;
  private introReady = false;
  private appeared = false;
  private disposed = false;
  private surface?: Mesh;
  static async create(canvas: HTMLCanvasElement, control: HTMLButtonElement, root: HTMLElement, signal: AbortSignal, options: Options) {
    const world = new FloatingEarthWorld(canvas, control, root, options);
    const cancel = () => world.dispose(); signal.addEventListener("abort", cancel, { once: true });
    world.runtime.own(() => signal.removeEventListener("abort", cancel));
    try {
      const container = await world.assets.load("/floating-earth/earth-vivid.glb");
      world.runtime.abort.signal.throwIfAborted();
      const model = instantiateModel(container, "Earth", 2.008);
      model.visual.position.y -= model.height / 2;
      model.root.parent = world.earth;
      // Normalize the supplied spherical GLB including its original cloud shell.
      world.surface = photographicEarth(world.runtime.scene, world.earth, model.meshes) as Mesh;
      world.surface.metadata = { blocker: true };
      world.bindInput();
      root.dataset.earthReady = "true"; root.dataset.engine = "babylon";
      root.style.setProperty("--earth-frame-scale", String(EARTH_VIEW_EXTENT / EARTH_DISPLAY_EXTENT));
      world.runtime.run(dt => world.update(dt));
      void world.loadExhibits();
      if (import.meta.dev) (window as any).__museum3d = { world, resources: runtimeResources, cacheBytes: assetCacheBytes };
      return world;
    } catch (error) { world.dispose(); throw error; }
  }
  private constructor(private canvas: HTMLCanvasElement, private control: HTMLButtonElement, private root: HTMLElement, private options: Options) {
    this.runtime = new SceneRuntime(canvas, readSettings().quality, () => { this.dispose(); options.fallback(); });
    const scene = this.runtime.scene;
    this.assets = new SceneAssets(scene, this.runtime.abort.signal); this.runtime.own(() => this.assets.dispose());
    this.earth = new TransformNode("Earth rotation", scene); this.earth.rotationQuaternion = INITIAL_EARTH_POSE.clone();
    this.camera = new FreeCamera("Earth camera", new Vector3(0, 0, 5), scene); this.camera.setTarget(Vector3.Zero());
    this.camera.mode = Camera.ORTHOGRAPHIC_CAMERA;
    this.camera.orthoLeft = -EARTH_VIEW_EXTENT; this.camera.orthoRight = EARTH_VIEW_EXTENT;
    this.camera.orthoTop = EARTH_VIEW_EXTENT; this.camera.orthoBottom = -EARTH_VIEW_EXTENT;
    this.camera.minZ = 0.01; this.camera.maxZ = 20;
    const hemi = new HemisphericLight("Soft blue skylight", Vector3.Up(), scene); hemi.intensity = 1.65;
    hemi.diffuse = Color3.FromHexString("#e9f3ff"); hemi.groundColor = Color3.FromHexString("#8a99a8");
    const sun = new DirectionalLight("Museum key", new Vector3(0.38, -0.4, -0.84), scene); sun.intensity = 2.5;
    this.highlights = new HighlightLayer("White silhouette glow", scene, { blurHorizontalSize: 0.6, blurVerticalSize: 0.6 });
    this.highlights.innerGlow = false; this.highlights.outerGlow = true;
    this.interaction.setReducedMotion(this.reduced);
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    this.runtime.listen(media, "change", () => { this.reduced = media.matches; this.interaction.setReducedMotion(this.reduced); });
  }
  private async loadExhibits() {
    const jobs = [this.addExhibit(DINOSAUR)];
    if (this.options.cybertruckEntry !== "locked") jobs.push(this.addExhibit({ ...CYBERTRUCK, normal: CYBERTRUCK.initialNormal }));
    await Promise.allSettled(jobs);
    if (this.disposed) return;
    this.introReady = true; this.elapsed = 0;
    // The monument is independently optional and never delays the reward intro.
    void this.addExhibit(STATUE).catch(() => { if (!this.disposed) this.root.dataset.statueSource = "unavailable"; });
  }
  private async addExhibit(definition: { id: string; modelUrl: string; size: number; normal: Vector3; yaw: number }) {
    const id = definition.id;
    try {
      const container = await this.assets.load(definition.modelUrl); this.runtime.abort.signal.throwIfAborted();
      const model = instantiateModel(container, id, definition.size, definition.yaw);
      const anchor = new TransformNode(`${id}:surface`, this.runtime.scene); anchor.parent = this.earth; model.root.parent = anchor;
      const normal = definition.normal.clone();
      const radius = id === "cybertruck" ? 0.985 : 1.008;
      anchor.position = normal.scale(radius); anchor.rotationQuaternion = surfaceOrientation(normal);
      for (const mesh of model.meshes) {
        if (mesh.skeleton && mesh instanceof Mesh) {
          // Babylon triangle picking otherwise tests the bind pose, while the
          // renderer uses bones. A hidden CPU-posed copy matches the static
          // home exhibit; the original display mesh/material/GLB stay intact.
          mesh.refreshBoundingInfo({ applySkeleton: true, applyMorph: true });
          const proxy = new Mesh(`${id}:posed selection`, this.runtime.scene);
          const data = new VertexData(); data.positions = mesh.getPositionData(true, true); data.indices = mesh.getIndices(); data.applyToMesh(proxy);
          proxy.parent = mesh.parent; proxy.position.copyFrom(mesh.position); proxy.scaling.copyFrom(mesh.scaling);
          proxy.rotationQuaternion = mesh.rotationQuaternion?.clone() ?? Quaternion.FromEulerVector(mesh.rotation);
          proxy.visibility = 0; proxy.metadata = { exhibit: id }; mesh.metadata = {};
        } else mesh.metadata = { exhibit: id };
        if (id !== "statue" && mesh instanceof Mesh) this.highlights.addMesh(mesh, Color3.White().scale(0.25));
      }
      if (id === "cybertruck") {
        // A local studio reflection restores the silver metal without changing the GLB or its maps.
        const faces = Array.from({ length: 6 }, (_, face) => {
          const pixels = new Uint8Array(32 * 32 * 4);
          for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
            const stripe = Math.abs(x - 14) < 4 ? 235 : 115 + (1 - y / 32) * 85;
            const v = face === 3 ? 110 : stripe;
            const i = (y * 32 + x) * 4; pixels.set([v, v, Math.min(255, v + 8), 255], i);
          }
          return pixels;
        });
        const env = new RawCubeTexture(this.runtime.scene, faces, 32); env.name = "Silver studio reflection";
        this.runtime.own(() => env.dispose());
        for (const mat of container.materials) if (mat instanceof PBRMaterial) { mat.reflectionTexture = env; mat.environmentIntensity = 1.25; }
      }
      const column = MeshBuilder.CreateCylinder(`${id}:light column`, { height: 0.78, diameterTop: 0.05, diameterBottom: 0.19, tessellation: 24 }, this.runtime.scene);
      column.parent = anchor; column.position.y = 0.39; column.isPickable = false;
      const light = new ShaderMaterial(`${id}:light`, this.runtime.scene, {
        vertexSource: `precision highp float; attribute vec3 position; attribute vec2 uv; uniform mat4 worldViewProjection; varying vec2 vUv; void main(){vUv=uv;gl_Position=worldViewProjection*vec4(position,1.);}`,
        fragmentSource: `precision highp float; varying vec2 vUv; uniform float strength; void main(){float a=(1.-smoothstep(.2,1.,vUv.y))*strength;gl_FragColor=vec4(1.,1.,1.,a*.45);}`,
      }, { attributes: ["position", "uv"], uniforms: ["worldViewProjection", "strength"], needAlphaBlending: true });
      light.backFaceCulling = false; light.disableDepthWrite = true; column.material = light;
      this.exhibits.push({ id, anchor, model, normal, column, light, radius, opacity: 0, phase: "waiting" });
      this.root.dataset[`${id}Source`] = "glb";
    } catch (error) {
      if (!this.disposed) this.root.dataset[`${id}Source`] = "unavailable";
      if (this.runtime.abort.signal.aborted) throw error;
    }
  }
  private bindInput() {
    const r = this.runtime;
    r.listen(this.control, "pointerdown", ((e: PointerEvent) => {
      if (!e.isPrimary || e.button !== 0) return;
      this.control.setPointerCapture(e.pointerId); this.interaction.begin(e.clientX, e.clientY, e.timeStamp / 1000);
    }) as EventListener);
    r.listen(this.control, "pointermove", ((e: PointerEvent) => this.interaction.move(e.clientX, e.clientY, e.timeStamp / 1000, this.control.clientWidth / EARTH_VIEW_EXTENT)) as EventListener);
    r.listen(this.control, "pointerup", ((e: PointerEvent) => {
      if (!this.interaction.active) return;
      this.interaction.move(e.clientX, e.clientY, e.timeStamp / 1000, this.control.clientWidth / EARTH_VIEW_EXTENT);
      const selected = !this.interaction.dragging && this.pick(e.clientX, e.clientY, e.pointerType === "touch" ? 10 : 6);
      if (selected) this.interaction.cancel(); else this.interaction.end(e.timeStamp / 1000);
      if (this.control.hasPointerCapture(e.pointerId)) this.control.releasePointerCapture(e.pointerId);
    }) as EventListener);
    r.listen(this.control, "pointercancel", () => this.interaction.cancel());
    r.listen(this.control, "lostpointercapture", () => { if (this.interaction.active) this.interaction.cancel(); });
    r.listen(this.control, "wheel", ((e: WheelEvent) => { e.preventDefault(); this.interaction.rotate(e.deltaY * 0.002, 0); }) as EventListener, { passive: false });
    r.listen(this.control, "keydown", ((e: KeyboardEvent) => {
      const step = e.shiftKey ? 0.3 : 0.12;
      if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "Enter", "Space"].includes(e.code)) return;
      e.preventDefault();
      if (e.code === "Home") { this.interaction.reset(); this.autoYaw = 0; }
      else if (["Enter", "Space"].includes(e.code)) this.interaction.tap();
      else this.interaction.rotate(e.code === "ArrowLeft" ? -step : e.code === "ArrowRight" ? step : 0, e.code === "ArrowUp" ? -step : e.code === "ArrowDown" ? step : 0);
    }) as EventListener);
  }
  private pick(clientX: number, clientY: number, radius: number) {
    const rect = this.canvas.getBoundingClientRect();
    for (const [dx, dy] of [[0, 0], [radius, 0], [-radius, 0], [0, radius], [0, -radius]]) {
      const hit = this.runtime.scene.pick(clientX - rect.left + dx!, clientY - rect.top + dy!, mesh => mesh.isEnabled() && mesh.isVisible && (!!mesh.metadata?.blocker || !!mesh.metadata?.exhibit));
      const id = hit?.pickedMesh?.metadata?.exhibit;
      const entity = this.exhibits.find(e => e.id === id);
      if (!entity || entity.opacity < 0.98) continue;
      if (id === "dinosaur") { this.options.activateDinosaur(); return true; }
      if (id === "cybertruck") { this.options.activateCybertruck(); return true; }
    }
    return false;
  }
  private update(dt: number) {
    this.interaction.update(dt);
    if (!this.interaction.active) this.autoYaw += Math.min(dt, 0.05) * 0.035;
    this.earth.rotationQuaternion = Quaternion.RotationAxis(Vector3.Up(), this.interaction.yaw + this.autoYaw).multiply(Quaternion.RotationAxis(Vector3.Right(), this.interaction.pitch)).multiply(INITIAL_EARTH_POSE);
    this.earth.computeWorldMatrix(true);
    if (this.introReady) this.elapsed += dt;
    const carSettled = this.exhibits.find(e => e.id === "cybertruck")?.phase === "settled";
    if (!this.reduced && carSettled) this.orbitAngle += Math.min(dt, 0.05) * CYBERTRUCK.orbitSpeed;
    for (const exhibit of this.exhibits) {
      const { id, anchor, model, column, light } = exhibit;
      if (id === "cybertruck") {
        exhibit.normal = CYBERTRUCK.initialNormal.applyRotationQuaternion(Quaternion.RotationAxis(CYBERTRUCK.orbitAxis, this.orbitAngle));
        const forward = Vector3.Cross(CYBERTRUCK.orbitAxis, exhibit.normal).normalize();
        const side = Vector3.Cross(exhibit.normal, forward).normalize();
        const matrix = Matrix.Identity(); Matrix.FromXYZAxesToRef(side, exhibit.normal, forward, matrix);
        anchor.rotationQuaternion = Quaternion.FromRotationMatrix(matrix); anchor.position = exhibit.normal.scale(exhibit.radius);
      }
      const frame = id === "statue" || (id === "cybertruck" && this.options.cybertruckEntry === "visible")
        ? { phase: "settled", opacity: 1, light: 0.06, scale: 1 } : revealAt(this.introReady ? this.elapsed : 0, this.reduced);
      exhibit.phase = frame.phase; exhibit.opacity = frame.opacity;
      model.root.scaling.setAll(frame.scale);
      const worldNormal = exhibit.normal.applyRotationQuaternion(this.earth.rotationQuaternion!);
      anchor.setEnabled(worldNormal.z > 0);
      model.root.setEnabled(frame.opacity > 0);
      for (const mesh of model.meshes) mesh.visibility = frame.opacity;
      column.setEnabled(id !== "statue" && !this.reduced && frame.light > 0.12);
      light.setFloat("strength", frame.light); column.scaling.y = Math.max(0.001, Math.min(1, (this.elapsed - 1.2) / 0.75));
      this.root.dataset[`${id}Reveal`] = frame.phase;
      this.root.dataset[`${id}Visible`] = String(anchor.isEnabled() && frame.opacity > 0);
      this.root.dataset[`${id}Column`] = String(anchor.isEnabled() && column.isEnabled());
      const button = id === "dinosaur" ? this.options.dinosaurControl : id === "cybertruck" ? this.options.cybertruckControl : undefined;
      if (button) this.positionButton(button, exhibit);
      if (id === "cybertruck" && frame.phase === "settled" && !this.appeared) { this.appeared = true; this.options.cybertruckAppeared(); }
    }
    this.root.dataset.earthYaw = String(this.interaction.yaw + this.autoYaw); this.root.dataset.earthPitch = String(this.interaction.pitch); this.root.dataset.dragging = String(this.interaction.dragging);
  }
  private positionButton(button: HTMLButtonElement, exhibit: Exhibit) {
    const visible = exhibit.anchor.isEnabled() && exhibit.opacity > 0.98;
    button.hidden = !visible; button.disabled = !visible;
    if (!visible) return;
    const rect = this.canvas.getBoundingClientRect(), parent = button.parentElement!.getBoundingClientRect();
    const bounds = exhibit.model.root.getHierarchyBoundingVectors(true);
    const corners: Vector3[] = [];
    for (const x of [bounds.min.x, bounds.max.x]) for (const y of [bounds.min.y, bounds.max.y]) for (const z of [bounds.min.z, bounds.max.z])
      corners.push(Vector3.Project(new Vector3(x, y, z), Matrix.Identity(), this.runtime.scene.getTransformMatrix(), this.camera.viewport.toGlobal(this.runtime.engine.getRenderWidth(), this.runtime.engine.getRenderHeight())));
    const sx = rect.width / this.runtime.engine.getRenderWidth(), sy = rect.height / this.runtime.engine.getRenderHeight();
    const x = Math.min(...corners.map(c => c.x)) * sx, y = Math.min(...corners.map(c => c.y)) * sy;
    Object.assign(button.style, { left: `${rect.left - parent.left + x}px`, top: `${rect.top - parent.top + y}px`, width: `${(Math.max(...corners.map(c => c.x)) * sx - x)}px`, height: `${(Math.max(...corners.map(c => c.y)) * sy - y)}px` });
  }
  setQuality(value: Quality) { this.runtime.setQuality(value); }
  dispose() {
    if (this.disposed) return; this.disposed = true;
    this.options.dinosaurControl.hidden = this.options.cybertruckControl.hidden = true;
    this.runtime.dispose();
    if (import.meta.dev && (window as any).__museum3d?.world === this) delete (window as any).__museum3d;
  }
}
