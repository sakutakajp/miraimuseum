import { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera";
import { Camera } from "@babylonjs/core/Cameras/camera";
import type { Scene } from "@babylonjs/core/scene";
import { clamp } from "~/lab/shared/camera";
import type { ImageCalibration } from "./calibration";
import type { CameraLimits, CameraState } from "./types";

const radians = (degrees: number) => degrees * Math.PI / 180;
const damp = (current: number, target: number, lambda: number, delta: number) =>
  current + (target - current) * (1 - Math.exp(-lambda * clamp(delta, 0, 0.064)));
export function createCamera(name: string, scene: Scene, calibration: ImageCalibration) {
  const camera = new ArcRotateCamera(name, calibration.alpha, calibration.beta,
    calibration.layout.calibration.distance, calibration.target.clone(), scene);
  camera.mode = Camera.ORTHOGRAPHIC_CAMERA;
  camera.minZ = 0.1; camera.maxZ = 80;
  camera.inputs.clear();
  setLens(camera, calibration, 1);
  return camera;
}

export function setLens(camera: ArcRotateCamera, calibration: ImageCalibration, zoom: number) {
  const halfWidth = calibration.layout.imageSize[0] / (2 * calibration.pixelsPerUnit * zoom);
  const halfHeight = calibration.layout.imageSize[1] / (2 * calibration.pixelsPerUnit * zoom);
  camera.orthoLeft = -halfWidth; camera.orthoRight = halfWidth;
  camera.orthoTop = halfHeight; camera.orthoBottom = -halfHeight;
  camera.unfreezeProjectionMatrix();
  const lens = camera.getProjectionMatrix(true).clone();
  lens.setRowFromFloats(0, lens.m[0]!, -calibration.shear * lens.m[0]!, lens.m[2]!, lens.m[3]!);
  camera.freezeProjectionMatrix(lens);
}

export class DioramaCameraControls {
  readonly state: CameraState = { yaw: 0, pitch: 0, zoom: 1 };
  private target: CameraState = { ...this.state };
  private limits: CameraLimits;
  private pointers = new Map<number, { x: number; y: number }>();
  private moved = false;
  private distance = 0;
  private abort = new AbortController();
  private reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  private enabled = true;

  constructor(private canvas: HTMLCanvasElement, private camera: ArcRotateCamera,
    private calibration: ImageCalibration, private requestRender: () => void,
    private select: (x: number, y: number) => void) {
    const config = calibration.layout.camera;
    this.limits = { yaw: config.yawLimit, pitch: config.pitchLimit };
    const options = { signal: this.abort.signal };
    canvas.addEventListener("pointerdown", this.down, options);
    canvas.addEventListener("pointermove", this.move, options);
    canvas.addEventListener("pointerup", this.up, options);
    canvas.addEventListener("pointercancel", this.cancel, options);
    canvas.addEventListener("lostpointercapture", this.cancel, options);
    canvas.addEventListener("wheel", this.wheel, { ...options, passive: false });
    canvas.addEventListener("keydown", this.key, options);
  }

  setEnabled(value: boolean) {
    this.enabled = value;
    if (!value) { this.pointers.clear(); this.distance = 0; this.canvas.dataset.dragging = "false"; }
  }
  setLimits(limits: CameraLimits) {
    this.limits = { yaw: clamp(limits.yaw, 0, 20), pitch: clamp(limits.pitch, 0, 10) };
    this.target.yaw = clamp(this.target.yaw, -this.limits.yaw, this.limits.yaw);
    this.target.pitch = clamp(this.target.pitch, -this.limits.pitch, this.limits.pitch);
    this.state.yaw = clamp(this.state.yaw, -this.limits.yaw, this.limits.yaw);
    this.state.pitch = clamp(this.state.pitch, -this.limits.pitch, this.limits.pitch);
    this.requestRender();
  }
  reset() { this.target = { yaw: 0, pitch: 0, zoom: 1 }; this.requestRender(); }
  zoomBy(factor: number) {
    const config = this.calibration.layout.camera;
    this.target.zoom = clamp(this.target.zoom * factor, config.zoomMin, config.zoomMax);
    this.requestRender();
  }
  private rotate(yaw: number, pitch: number) {
    this.target.yaw = clamp(this.target.yaw + yaw, -this.limits.yaw, this.limits.yaw);
    this.target.pitch = clamp(this.target.pitch + pitch, -this.limits.pitch, this.limits.pitch);
    this.requestRender();
  }
  private pinchDistance() {
    const points = [...this.pointers.values()];
    return points.length < 2 ? 0 : Math.hypot(points[0]!.x - points[1]!.x, points[0]!.y - points[1]!.y);
  }
  private down = (event: PointerEvent) => {
    if (!this.enabled || (event.pointerType === "mouse" && event.button !== 0)) return;
    event.preventDefault();
    if (!this.pointers.size) this.moved = false;
    this.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (this.pointers.size > 1) this.moved = true;
    this.distance = this.pinchDistance();
    this.canvas.setPointerCapture(event.pointerId);
    this.canvas.dataset.dragging = "true";
    this.canvas.focus({ preventScroll: true });
  };
  private move = (event: PointerEvent) => {
    const previous = this.pointers.get(event.pointerId);
    if (!this.enabled || !previous) return;
    const dx = event.clientX - previous.x, dy = event.clientY - previous.y;
    this.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (this.pointers.size >= 2) {
      const distance = this.pinchDistance();
      if (this.distance > 0) this.zoomBy(distance / this.distance);
      this.distance = distance;
    } else if (dx || dy) {
      if (Math.abs(dx) + Math.abs(dy) > 1) this.moved = true;
      const width = Math.max(1, this.canvas.clientWidth);
      this.rotate(-dx / width * 52, dy / width * 28);
    }
  };
  private up = (event: PointerEvent) => {
    if (!this.pointers.has(event.pointerId)) return;
    const click = this.enabled && !this.moved && this.pointers.size === 1;
    this.pointers.delete(event.pointerId);
    this.distance = this.pinchDistance();
    if (this.canvas.hasPointerCapture(event.pointerId)) this.canvas.releasePointerCapture(event.pointerId);
    this.canvas.dataset.dragging = String(this.pointers.size > 0);
    if (click) {
      const box = this.canvas.getBoundingClientRect();
      this.select(event.clientX - box.left, event.clientY - box.top);
    }
  };
  private cancel = (event: PointerEvent) => {
    this.pointers.delete(event.pointerId); this.distance = this.pinchDistance();
    this.canvas.dataset.dragging = String(this.pointers.size > 0);
  };
  private wheel = (event: WheelEvent) => {
    if (!this.enabled) return;
    event.preventDefault();
    const pixels = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? this.canvas.clientHeight : 1);
    this.zoomBy(Math.exp(-clamp(pixels, -150, 150) * 0.0018));
  };
  private key = (event: KeyboardEvent) => {
    if (!this.enabled) return;
    const actions: Record<string, () => void> = {
      ArrowLeft: () => this.rotate(-1, 0), ArrowRight: () => this.rotate(1, 0),
      ArrowUp: () => this.rotate(0, -1), ArrowDown: () => this.rotate(0, 1),
      "+": () => this.zoomBy(1.08), "=": () => this.zoomBy(1.08), "-": () => this.zoomBy(1/1.08),
      Home: () => this.reset(), "0": () => this.reset(),
    };
    if (actions[event.key]) { event.preventDefault(); actions[event.key]!(); }
  };
  update(delta: number): boolean {
    let moving = false;
    for (const key of ["yaw", "pitch", "zoom"] as const) {
      const value = this.reducedMotion ? this.target[key] : damp(this.state[key], this.target[key], 20, delta);
      this.state[key] = Math.abs(value - this.target[key]) < 0.0001 ? this.target[key] : value;
      moving ||= this.state[key] !== this.target[key];
    }
    this.camera.alpha = this.calibration.alpha + radians(this.state.yaw);
    this.camera.beta = this.calibration.beta + radians(this.state.pitch);
    setLens(this.camera, this.calibration, this.state.zoom);
    return moving;
  }
  dispose() { this.abort.abort(); this.pointers.clear(); }
}
