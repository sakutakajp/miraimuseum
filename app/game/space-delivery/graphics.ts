// Tiny canvas drawing vocabulary for the generated pixel layers. No renderer or physics dependencies.
import type { Vec } from "./types";
const color = (value: number) => "#" + value.toString(16).padStart(6, "0");
export class PixelGraphics {
  readonly canvas = document.createElement("canvas");
  readonly context: CanvasRenderingContext2D;
  private fillAlpha = 1;
  private strokeAlpha = 1;
  private x = 0;
  private y = 0;
  private rotation = 0;
  constructor() {
    this.context = this.canvas.getContext("2d")!;
    this.resize(180, 260);
  }
  resize(width: number, height: number) {
    this.canvas.width = width;
    this.canvas.height = height;
    this.transform();
  }
  private transform() {
    this.context.setTransform(
      this.canvas.width / 360,
      0,
      0,
      this.canvas.height / 520,
      0,
      0,
    );
    this.context.translate(this.x, this.y);
    this.context.rotate(this.rotation);
  }
  setPosition(x: number, y: number) {
    this.x = x;
    this.y = y;
    this.transform();
  }
  setRotation(rotation: number) {
    this.rotation = rotation;
    this.transform();
  }
  clear() {
    this.context.setTransform(1, 0, 0, 1, 0, 0);
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.transform();
    this.context.beginPath();
  }
  fillStyle(value: number, alpha = 1) {
    this.context.fillStyle = color(value);
    this.fillAlpha = alpha;
  }
  lineStyle(width: number, value: number, alpha = 1) {
    this.context.strokeStyle = color(value);
    this.context.lineWidth = width;
    this.strokeAlpha = alpha;
    this.context.lineJoin = "round";
    this.context.lineCap = "round";
  }
  private fill() {
    this.context.globalAlpha = this.fillAlpha;
    this.context.fill();
  }
  private stroke() {
    this.context.globalAlpha = this.strokeAlpha;
    this.context.stroke();
  }
  fillRect(x: number, y: number, w: number, h: number) {
    this.context.globalAlpha = this.fillAlpha;
    this.context.fillRect(x, y, w, h);
  }
  strokeRect(x: number, y: number, w: number, h: number) {
    this.context.globalAlpha = this.strokeAlpha;
    this.context.strokeRect(x, y, w, h);
  }
  fillRoundedRect(x: number, y: number, w: number, h: number, r: number) {
    this.context.beginPath();
    this.context.roundRect(x, y, w, h, r);
    this.fill();
  }
  strokeRoundedRect(x: number, y: number, w: number, h: number, r: number) {
    this.context.beginPath();
    this.context.roundRect(x, y, w, h, r);
    this.stroke();
  }
  fillCircle(x: number, y: number, r: number) {
    this.context.beginPath();
    this.context.arc(x, y, r, 0, Math.PI * 2);
    this.fill();
  }
  strokeCircle(x: number, y: number, r: number) {
    this.context.beginPath();
    this.context.arc(x, y, r, 0, Math.PI * 2);
    this.stroke();
  }
  fillEllipse(x: number, y: number, w: number, h: number) {
    this.context.beginPath();
    this.context.ellipse(x, y, w / 2, h / 2, 0, 0, Math.PI * 2);
    this.fill();
  }
  strokeEllipse(x: number, y: number, w: number, h: number) {
    this.context.beginPath();
    this.context.ellipse(x, y, w / 2, h / 2, 0, 0, Math.PI * 2);
    this.stroke();
  }
  fillTriangle(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    x3: number,
    y3: number,
  ) {
    this.fillPoints(
      [
        { x: x1, y: y1 },
        { x: x2, y: y2 },
        { x: x3, y: y3 },
      ],
      true,
    );
  }
  private points(points: Vec[], close: boolean) {
    this.context.beginPath();
    points.forEach((p, i) =>
      i ? this.context.lineTo(p.x, p.y) : this.context.moveTo(p.x, p.y),
    );
    if (close) this.context.closePath();
  }
  fillPoints(points: Vec[], close: boolean) {
    this.points(points, close);
    this.fill();
  }
  strokePoints(points: Vec[], close: boolean) {
    this.points(points, close);
    this.stroke();
  }
  beginPath() {
    this.context.beginPath();
  }
  moveTo(x: number, y: number) {
    this.context.moveTo(x, y);
  }
  lineTo(x: number, y: number) {
    this.context.lineTo(x, y);
  }
  arc(x: number, y: number, r: number, start: number, end: number) {
    this.context.arc(x, y, r, start, end);
  }
  strokePath() {
    this.stroke();
  }
  lineBetween(x1: number, y1: number, x2: number, y2: number) {
    this.beginPath();
    this.moveTo(x1, y1);
    this.lineTo(x2, y2);
    this.stroke();
  }
}
