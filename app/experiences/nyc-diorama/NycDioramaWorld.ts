import { Engine } from "@babylonjs/core/Engines/engine";
import "@babylonjs/core/Culling/ray";
import { Scene } from "@babylonjs/core/scene";
import { Texture } from "@babylonjs/core/Materials/Textures/texture";
import { Layer } from "@babylonjs/core/Layers/layer";
import { CreateBox } from "@babylonjs/core/Meshes/Builders/boxBuilder";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Matrix, Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Viewport } from "@babylonjs/core/Maths/math.viewport";
import { Color4 } from "@babylonjs/core/Maths/math.color";
import { ImageCalibration } from "./calibration";
import { createCamera, DioramaCameraControls } from "./camera";
import { createGroundPolygon, createImageCard, createProjectedRelief } from "./geometry";
import { createCardMaterial, createProjectionMaterial } from "./materials";
import type { AssetManifest, CameraLimits, CameraState, DioramaLayout, DioramaMode, LayerDefinition, Point } from "./types";

interface Callbacks {
  camera: (state: CameraState) => void;
  select: (name: string | null) => void;
  error: (message: string) => void;
}
function contains(polygon: Point[], point: Point) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i]!, b = polygon[j]!;
    if ((a[1] > point[1]) !== (b[1] > point[1]) && point[0] < (b[0] - a[0]) * (point[1] - a[1]) / (b[1] - a[1]) + a[0]) inside = !inside;
  }
  return inside;
}

export class NycDioramaWorld {
  private engine: Engine;
  private scene: Scene;
  private calibration: ImageCalibration;
  private controls: DioramaCameraControls;
  private projection: TransformNode;
  private parallax: TransformNode;
  private sourceMatrix: Matrix;
  private frameId = 0;
  private lastTime = 0;
  private lastNotification = 0;
  private disposed = false;
  private mode: DioramaMode = "original";
  private resize: ResizeObserver;
  private listeners = new AbortController();
  private pixelRatioLimit: number;
  private viewport: Viewport;
  private renderCount = 0;
  private backgroundTexture?: Texture;

  private constructor(private canvas: HTMLCanvasElement, private layout: DioramaLayout,
    private manifest: AssetManifest, private callbacks: Callbacks) {
    const mobile = matchMedia("(pointer: coarse)").matches || innerWidth < 680;
    const resolution = layout.rendering;
    this.pixelRatioLimit = navigator.hardwareConcurrency <= 2 ? resolution.lowCoreDpr
      : mobile ? resolution.mobileDpr : resolution.desktopDpr;
    this.engine = new Engine(canvas, true, { stencil: false, preserveDrawingBuffer: false, powerPreference: "low-power", audioEngine: false }, false);
    this.engine.setHardwareScalingLevel(1 / Math.min(devicePixelRatio || 1, this.pixelRatioLimit));
    this.scene = new Scene(this.engine);
    // Custom controls own input. Babylon's default focus on pointer-down can
    // scroll the page between down/up and invalidate the landmark hit position.
    this.scene.detachControl();
    this.scene.clearColor = new Color4(0.69, 0.86, 0.96, 1);
    this.scene.imageProcessingConfiguration.isEnabled = false;
    this.scene.skipPointerMovePicking = true;
    this.scene.skipPointerDownPicking = true;
    this.scene.skipPointerUpPicking = true;
    this.calibration = new ImageCalibration(layout);
    const sourceCamera = createCamera("reference-projector", this.scene, this.calibration);
    this.sourceMatrix = sourceCamera.getViewMatrix(true).multiply(sourceCamera.getProjectionMatrix()).clone();
    const camera = createCamera("viewer", this.scene, this.calibration);
    this.scene.activeCamera = camera;
    this.viewport = new Viewport(0, 0, ...layout.imageSize);
    this.controls = new DioramaCameraControls(canvas, camera, this.calibration, () => this.schedule(), (x, y) => this.pick(x, y));
    this.projection = new TransformNode("camera-projection", this.scene);
    this.parallax = new TransformNode("parallax", this.scene);
    this.projection.setEnabled(false); this.parallax.setEnabled(false);
    this.resize = new ResizeObserver(() => {
      this.engine.setHardwareScalingLevel(1 / Math.min(devicePixelRatio || 1, this.pixelRatioLimit));
      this.engine.resize(); this.schedule();
    });
    this.resize.observe(canvas);
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) { cancelAnimationFrame(this.frameId); this.frameId = 0; }
      else { this.lastTime = 0; this.schedule(); }
    }, { signal: this.listeners.signal });
    this.engine.onContextLostObservable.add(() => {
      callbacks.error("3D描画が中断されました。元画像に切り替えるか、再試行してください。");
    });
  }

  static async create(canvas: HTMLCanvasElement, signal: AbortSignal, callbacks: Callbacks) {
    const [layout, manifest] = await Promise.all([
      fetch("/diorama/nyc-layout.json", { signal }).then(async r => { if (!r.ok) throw new Error("配置データを読み込めません。"); return r.json() as Promise<DioramaLayout>; }),
      fetch("/diorama/generated/manifest.json", { signal }).then(async r => { if (!r.ok) throw new Error("切り抜き画像がありません。素材を再生成してください。"); return r.json() as Promise<AssetManifest>; }),
    ]);
    if (signal.aborted) throw new DOMException("Cancelled", "AbortError");
    if (layout.version !== 1 || manifest.imageSize.join() !== layout.imageSize.join()) throw new Error("画像と配置データの寸法が一致しません。");
    const world = new NycDioramaWorld(canvas, layout, manifest, callbacks);
    const abort = () => world.dispose();
    signal.addEventListener("abort", abort, { once: true });
    try {
      await world.build(signal);
      if (signal.aborted) throw new DOMException("Cancelled", "AbortError");
      return world;
    } catch (error) { world.dispose(); throw error; }
    finally { signal.removeEventListener("abort", abort); }
  }

  private texture(url: string, signal: AbortSignal, invertY = false): Promise<Texture> {
    return new Promise((resolve, reject) => {
      const fail = () => reject(new DOMException("Cancelled", "AbortError"));
      signal.addEventListener("abort", fail, { once: true });
      const texture = new Texture(url, this.scene, false, invertY, Texture.TRILINEAR_SAMPLINGMODE,
        () => { signal.removeEventListener("abort", fail); resolve(texture); },
        () => { signal.removeEventListener("abort", fail); reject(new Error(`画像を読み込めません: ${url}`)); });
      texture.wrapU = Texture.CLAMP_ADDRESSMODE; texture.wrapV = Texture.CLAMP_ADDRESSMODE;
      texture.hasAlpha = true; texture.anisotropicFilteringLevel = 4;
      return;
    });
  }

  private async build(signal: AbortSignal) {
    const [ground, background, ...textures] = await Promise.all([
      this.texture("/diorama/generated/ground.png", signal),
      this.texture("/diorama/generated/background.jpg", signal, true),
      ...this.manifest.layers.map(asset => this.texture(asset.file, signal)),
    ]);
    if (this.disposed) return;
    const backdrop = new Layer("source-sky-and-contact-shadow", null, this.scene, true);
    backdrop.texture = background!;
    this.backgroundTexture = background!;
    const config = this.layout.calibration;
    const base = CreateBox("square-white-plinth", { width: config.baseSize, depth: config.baseSize, height: config.baseThickness }, this.scene);
    base.position.y = config.baseTop - config.baseThickness / 2;
    base.parent = this.projection;
    base.isPickable = false;
    base.material = createProjectionMaterial("ground-projection", this.scene, ground!, this.sourceMatrix,
      this.calibration.towardCamera, this.layout.imageSize, "#ece9e3");
    for (let i = 0; i < this.layout.layers.length; i++) {
      const layer = this.layout.layers[i]!;
      const assetIndex = this.manifest.layers.findIndex(asset => asset.id === layer.id);
      if (assetIndex < 0) throw new Error(`Missing cutout ${layer.id}`);
      const asset = this.manifest.layers[assetIndex]!;
      const texture = textures[assetIndex]!;
      const card = createImageCard(`parallax-${layer.id}`, asset.bounds, layer.depth * this.layout.parallax.depthScale, this.calibration, this.scene);
      card.parent = this.parallax;
      card.material = createCardMaterial(`photo-${layer.id}`, this.scene, texture);
      card.alphaIndex = i;
      card.metadata = { layerId: layer.id, asset, mode: "parallax" };
      card.isPickable = layer.kind !== "base" && layer.kind !== "ground";
      if (layer.kind === "base") continue;
      const material = createProjectionMaterial(`projection-${layer.id}`, this.scene, texture,
        this.sourceMatrix, this.calibration.towardCamera, this.layout.imageSize, layer.color, asset);
      const polygons = [...layer.polygons, ...asset.wirePolygons];
      for (let p = 0; p < polygons.length; p++) {
        const polygon = polygons[p]!;
        const name = `projection-${layer.id}-${p}`;
        const meshes = layer.kind === "ground"
          ? [createGroundPolygon(name, polygon, this.calibration, this.scene)]
          : createProjectedRelief(layer, polygon, layer.groundLines?.[p] ?? layer.groundLines?.[0] ??
            [[0, 900], [1254, 900]], this.calibration, this.scene, name);
        for (const mesh of meshes) {
          mesh.parent = this.projection; mesh.material = material;
          mesh.metadata = { layerId: layer.id, asset, mode: "projection" };
          mesh.isPickable = layer.kind !== "ground";
        }
      }
    }
    await this.scene.whenReadyAsync();
    this.canvas.dataset.layerCount = String(this.layout.layers.length);
    this.canvas.dataset.projectionMeshes = String(this.projection.getChildMeshes().length);
    this.canvas.dataset.parallaxMeshes = String(this.parallax.getChildMeshes().length);
    this.canvas.dataset.texturePixels = String([ground!, background!, ...textures].reduce((sum, t) => sum + t.getSize().width * t.getSize().height, 0));
    this.canvas.dataset.projectionTriangles = String(this.projection.getChildMeshes().reduce((sum, mesh) => sum + mesh.getTotalIndices() / 3, 0));
    this.engine.resize();
  }

  setMode(mode: DioramaMode) {
    this.mode = mode;
    this.projection.setEnabled(mode === "projection"); this.parallax.setEnabled(mode === "parallax");
    this.controls.setEnabled(mode !== "original");
    this.callbacks.select(null);
    this.lastTime = 0;
    if (mode === "original") { cancelAnimationFrame(this.frameId); this.frameId = 0; }
    else this.schedule();
  }
  setLimits(limits: CameraLimits) { this.controls.setLimits(limits); }
  reset() { this.controls.reset(); this.callbacks.select(null); }
  zoomBy(factor: number) { this.controls.zoomBy(factor); }

  private pick(x: number, y: number) {
    const hits = this.scene.multiPick(x, y, mesh => mesh.isEnabled() && mesh.isPickable) ?? [];
    hits.sort((a, b) => a.distance - b.distance);
    for (const hit of hits) {
      if (!hit.pickedMesh?.metadata || !hit.pickedPoint) continue;
      const meta = hit.pickedMesh.metadata;
      const layer = this.layout.layers.find(item => item.id === meta.layerId)!;
      let point: Point;
      if (this.mode === "parallax") {
        const uv = hit.getTextureCoordinates();
        if (!uv) continue;
        const [l, t, r, b] = meta.asset.bounds as [number, number, number, number];
        point = [l + uv.x * (r-l), t + uv.y * (b-t)];
      } else {
        const pixel = Vector3.Project(hit.pickedPoint, Matrix.Identity(), this.sourceMatrix, this.viewport);
        point = [pixel.x, pixel.y];
      }
      if (!layer.polygons.some(p => contains(p, point)) && !meta.asset.wirePolygons.some((p: Point[]) => contains(p, point))) continue;
      this.callbacks.select(layer.label); return;
    }
    this.callbacks.select(null);
  }

  private schedule() {
    if (this.disposed || this.mode === "original" || document.hidden || this.frameId) return;
    this.frameId = requestAnimationFrame(this.render);
  }
  private render = (now: number) => {
    this.frameId = 0;
    if (this.disposed || document.hidden || this.mode === "original") return;
    const delta = this.lastTime ? Math.min((now - this.lastTime) / 1000, 0.064) : 1 / 60;
    this.lastTime = now;
    const moving = this.controls.update(delta);
    if (this.backgroundTexture) {
      const scale = 1 / this.controls.state.zoom;
      this.backgroundTexture.uScale = scale; this.backgroundTexture.vScale = scale;
      this.backgroundTexture.uOffset = (1 - scale) / 2; this.backgroundTexture.vOffset = (1 - scale) / 2;
    }
    const start = performance.now();
    this.scene.render();
    this.canvas.dataset.renderMs = String(performance.now() - start);
    this.canvas.dataset.renderCount = String(++this.renderCount);
    const state = this.controls.state;
    this.canvas.dataset.yaw = String(state.yaw);
    this.canvas.dataset.pitch = String(state.pitch);
    this.canvas.dataset.zoom = String(state.zoom);
    if (!moving || now - this.lastNotification > 100) { this.callbacks.camera({ ...state }); this.lastNotification = now; }
    if (moving || !this.scene.isReady()) this.schedule();
  };

  dispose() {
    if (this.disposed) return;
    this.disposed = true; cancelAnimationFrame(this.frameId); this.frameId = 0;
    this.resize.disconnect(); this.listeners.abort(); this.controls.dispose();
    this.scene.dispose(); this.engine.dispose();
  }
}
