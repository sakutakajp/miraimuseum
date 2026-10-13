import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import type { DioramaLayout, Point } from "./types";

/** The source is nearly axonometric, but its two base edges are not a perfect
 * orthographic square. A small, constant vertical shear fits the photograph
 * while keeping a genuinely square 3D box. Both modes use this same lens. */
export class ImageCalibration {
  readonly pixelsPerUnit: number;
  readonly verticalPixelsPerUnit: number;
  readonly shear: number;
  readonly alpha: number;
  readonly beta: number;
  readonly target: Vector3;
  readonly right: Vector3;
  readonly up: Vector3;
  readonly towardCamera: Vector3;
  readonly center: Point;
  private readonly axisX: Point;
  private readonly axisZ: Point;

  constructor(readonly layout: DioramaLayout) {
    const { baseLeft: l, baseFront: f, baseRight: r, baseSize: size, baseTop } = layout.calibration;
    this.axisX = [(f[0] - l[0]) / size, (f[1] - l[1]) / size];
    this.axisZ = [(r[0] - f[0]) / size, (r[1] - f[1]) / size];
    this.center = [(l[0] + r[0]) / 2, (l[1] + r[1]) / 2];
    this.pixelsPerUnit = Math.hypot(this.axisX[0], this.axisZ[0]);
    const rx = this.axisX[0] / this.pixelsPerUnit;
    const rz = this.axisZ[0] / this.pixelsPerUnit;
    const sinElevation = (this.axisX[1] * rz - this.axisZ[1] * rx) / this.pixelsPerUnit;
    const cosElevation = Math.sqrt(1 - sinElevation ** 2);
    this.shear = (this.axisX[1] * rx + this.axisZ[1] * rz) / this.pixelsPerUnit;
    this.alpha = -Math.atan2(rx, rz);
    this.beta = Math.acos(sinElevation);
    this.verticalPixelsPerUnit = this.pixelsPerUnit * cosElevation;
    this.right = new Vector3(rx, 0, rz);
    this.up = new Vector3(-sinElevation * rz, cosElevation, sinElevation * rx);
    this.towardCamera = new Vector3(cosElevation * rz, sinElevation, -cosElevation * rx);
    const offset = (layout.imageSize[0] / 2 - this.center[0]) / this.pixelsPerUnit;
    this.target = new Vector3(rx * offset,
      baseTop + (this.center[1] - layout.imageSize[1] / 2 + this.shear * offset * this.pixelsPerUnit) / this.verticalPixelsPerUnit,
      rz * offset);
  }

  /** Intersect a reference-image ray with a horizontal world plane. */
  onHeight([px, py]: Point, height: number): Vector3 {
    const dx = px - this.center[0];
    const dy = py - this.center[1] + (height - this.layout.calibration.baseTop) * this.verticalPixelsPerUnit;
    const [ax, ay] = this.axisX;
    const [zx, zy] = this.axisZ;
    const determinant = ax * zy - zx * ay;
    return new Vector3((dx * zy - dy * zx) / determinant, height, (ax * dy - ay * dx) / determinant);
  }

  /** Reference-aligned image card, placed at an independent view-space depth. */
  onDepth([px, py]: Point, depth: number): Vector3 {
    const x = (px - this.layout.imageSize[0] / 2) / this.pixelsPerUnit;
    const y = -(py - this.layout.imageSize[1] / 2) / this.pixelsPerUnit + this.shear * x;
    return this.target.add(this.right.scale(x)).add(this.up.scale(y)).add(this.towardCamera.scale(depth));
  }
}
