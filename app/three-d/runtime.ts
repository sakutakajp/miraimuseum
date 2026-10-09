import { Engine, Scene, SceneInstrumentation, type Mesh } from "@babylonjs/core";
import { qualityProfile, type Quality } from "./settings";

// Counters measure owned resources across route changes, without retaining Scenes.
import { runtimeResources } from "./diagnostics";
export { runtimeResources } from "./diagnostics";
export class SceneRuntime {
  readonly engine: Engine;
  readonly scene: Scene;
  readonly abort = new AbortController();
  readonly instrumentation: SceneInstrumentation;
  private cleanups: (() => void)[] = [];
  private running = false;
  private disposed = false;
  private previous = 0;
  private frame?: (dt: number) => void;
  private quality: Quality;
  constructor(readonly canvas: HTMLCanvasElement, quality: Quality, onFailure: (error: unknown) => void) {
    this.quality = quality;
    this.engine = new Engine(canvas, true, { preserveDrawingBuffer: false, stencil: true, powerPreference: "high-performance", audioEngine: false });
    if (this.engine.webGLVersion < 2) { this.engine.dispose(); throw new Error("WebGL2 is required"); }
    runtimeResources.engines++;
    this.scene = new Scene(this.engine);
    this.scene.useRightHandedSystem = true;
    this.instrumentation = new SceneInstrumentation(this.scene);
    this.instrumentation.captureFrameTime = true;
    this.cleanups.push(() => this.instrumentation.dispose());
    this.scene.imageProcessingConfiguration.toneMappingEnabled = false;
    runtimeResources.scenes++;
    this.listen(document, "visibilitychange", () => document.hidden ? this.stop() : this.start());
    this.listen(canvas, "webglcontextlost", (e: Event) => { e.preventDefault(); this.stop(); onFailure(new Error("WebGL context lost")); });
    const observer = new ResizeObserver(() => this.resize());
    observer.observe(canvas);
    this.cleanups.push(() => observer.disconnect());
    this.resize();
  }
  listen(target: EventTarget, name: string, callback: EventListener, options?: AddEventListenerOptions) {
    target.addEventListener(name, callback, options);
    runtimeResources.listeners++;
    this.cleanups.push(() => { target.removeEventListener(name, callback, options); runtimeResources.listeners--; });
  }
  own(cleanup: () => void) { this.cleanups.push(cleanup); }
  setQuality(value: Quality) { this.quality = value; this.resize(); }
  metrics() {
    const geometries = new Set(this.scene.meshes.map(mesh => (mesh as Mesh).geometry).filter(Boolean));
    const geometryBytes = [...geometries].reduce((sum, geometry) => sum + geometry!.getTotalVertices() * 32 + geometry!.getTotalIndices() * 4, 0);
    const textureBytes = this.scene.textures.reduce((sum, texture) => { const size = texture.getSize(); return sum + size.width * size.height * 4 * (texture.isCube ? 6 : 1) * 4 / 3; }, 0);
    return { meshes: this.scene.meshes.length, activeMeshes: this.scene.getActiveMeshes().length, materials: this.scene.materials.length, textures: this.scene.textures.length,
      drawCalls: this.instrumentation.drawCallsCounter.current, fps: this.engine.getFps(), frameMs: this.instrumentation.frameTimeCounter.current,
      estimatedGeometryBytes: geometryBytes, estimatedTextureBytes: Math.round(textureBytes) };
  }
  private resize() {
    if (this.disposed) return;
    const ratio = Math.min(window.devicePixelRatio || 1, qualityProfile[this.quality].pixelRatio);
    this.engine.setHardwareScalingLevel(1 / ratio);
    this.engine.resize();
  }
  run(frame: (dt: number) => void) { this.frame = frame; this.start(); }
  private render = () => {
    if (this.disposed || document.hidden) return;
    const now = performance.now();
    const dt = this.previous ? Math.min(0.25, (now - this.previous) / 1000) : 0;
    this.previous = now;
    this.frame?.(dt);
    if (!this.disposed) this.scene.render();
  };
  start() {
    if (this.disposed || this.running || document.hidden || !this.frame) return;
    this.previous = 0; this.running = true; runtimeResources.loops++;
    this.engine.runRenderLoop(this.render);
  }
  stop() {
    if (!this.running) return;
    this.engine.stopRenderLoop(this.render); this.running = false; this.previous = 0; runtimeResources.loops--;
  }
  dispose() {
    if (this.disposed) return;
    this.disposed = true; this.abort.abort(); this.stop();
    for (const cleanup of this.cleanups.splice(0).reverse()) cleanup();
    this.scene.dispose(); runtimeResources.scenes--;
    this.engine.dispose(); runtimeResources.engines--;
    this.frame = undefined;
  }
}
