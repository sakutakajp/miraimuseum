const TAU = Math.PI * 2;
const DRAG_THRESHOLD = 7;
const MAX_PITCH = 0.9;
const MAX_VELOCITY = 8;
const DAMPING = 4.8;
const REST_VELOCITY = 0.0001;
const MAX_FRAME_DELTA = 0.1;
const RELEASE_WINDOW = 0.15;
const TAP_STEP = 0.18;

const clamp = (value: number, limit: number) =>
  Math.max(-limit, Math.min(limit, value));

export type EarthGesture = "tap" | "drag";

/** Pointer-independent rotation. Angles are radians; timestamps are seconds. */
export class EarthInteraction {
  private angleY = 0;
  private angleX = 0;
  private velocityY = 0;
  private velocityX = 0;
  private reducedMotion = false;
  private pointerActive = false;
  private pointerDragged = false;
  private startX = 0;
  private startY = 0;
  private lastX = 0;
  private lastY = 0;
  private lastTime = 0;
  private sampledVelocity = false;

  get yaw() {
    return this.angleY;
  }

  get pitch() {
    return this.angleX;
  }

  /** Includes a pending tap before the drag threshold is crossed. */
  get active() {
    return this.pointerActive;
  }

  get dragging() {
    return this.pointerActive && this.pointerDragged;
  }

  get moving() {
    return (
      Math.abs(this.velocityY) > REST_VELOCITY ||
      Math.abs(this.velocityX) > REST_VELOCITY
    );
  }

  begin(x: number, y: number, timeSeconds: number) {
    if (![x, y, timeSeconds].every(Number.isFinite)) return;
    this.cancel();
    this.pointerActive = true;
    this.startX = this.lastX = x;
    this.startY = this.lastY = y;
    this.lastTime = timeSeconds;
  }

  /** One Earth diameter of horizontal movement makes one full rotation. */
  move(x: number, y: number, timeSeconds: number, scalePixels: number) {
    if (
      !this.pointerActive ||
      ![x, y, timeSeconds, scalePixels].every(Number.isFinite) ||
      scalePixels <= 0
    )
      return;

    if (!this.pointerDragged) {
      if (Math.hypot(x - this.startX, y - this.startY) < DRAG_THRESHOLD)
        return;
      this.pointerDragged = true;
    }

    // A pointerup may be passed through move() to pick up its final coordinates.
    // A repeated position must not refresh a held gesture's release window.
    if (x === this.lastX && y === this.lastY) return;

    const deltaY = ((x - this.lastX) / scalePixels) * TAU;
    const deltaX = ((y - this.lastY) / scalePixels) * Math.PI;
    const elapsed = timeSeconds - this.lastTime;
    const previousPitch = this.angleX;
    this.angleY += deltaY;
    this.angleX = clamp(this.angleX + deltaX, MAX_PITCH);

    if (!this.reducedMotion && elapsed > 0) {
      const sampleTime = Math.max(0.001, elapsed);
      const nextY = clamp(deltaY / sampleTime, MAX_VELOCITY);
      const nextX = clamp(
        (this.angleX - previousPitch) / sampleTime,
        MAX_VELOCITY,
      );
      // Smooth event jitter without making the first movement feel sluggish.
      const blend = this.sampledVelocity ? 1 - Math.exp(-24 * elapsed) : 1;
      this.velocityY += (nextY - this.velocityY) * blend;
      this.velocityX += (nextX - this.velocityX) * blend;
      this.sampledVelocity = true;
      this.stopPitchAtBoundary();
    }

    this.lastX = x;
    this.lastY = y;
    this.lastTime = timeSeconds;
  }

  /** Releases the gesture and automatically spins the Earth for a tap. */
  end(timeSeconds: number): EarthGesture | null {
    if (!this.pointerActive) return null;
    const gesture = this.pointerDragged ? "drag" : "tap";
    this.pointerActive = false;
    this.pointerDragged = false;

    if (gesture === "tap") {
      this.tap();
    } else if (
      !Number.isFinite(timeSeconds) ||
      timeSeconds - this.lastTime > RELEASE_WINDOW
    ) {
      // Holding a dragged globe still before release must not fling it.
      this.clearVelocity();
    } else if (timeSeconds > this.lastTime) {
      const decay = Math.exp(-DAMPING * (timeSeconds - this.lastTime));
      this.velocityY *= decay;
      this.velocityX *= decay;
    }
    return gesture;
  }

  /** Cancels capture without manufacturing a tap or a release fling. */
  cancel() {
    this.pointerActive = false;
    this.pointerDragged = false;
    this.sampledVelocity = false;
    this.clearVelocity();
  }

  tap() {
    if (this.pointerActive) this.cancel();
    if (this.reducedMotion) {
      this.angleY += Math.PI / 4;
      this.clearVelocity();
      return;
    }
    this.angleY += TAP_STEP;
    // The complete gesture settles at a quarter-turn from its starting pose.
    this.velocityY = DAMPING * (Math.PI / 2 - TAP_STEP);
    this.velocityX = 0;
  }

  /** Direct rotation for keyboard input; deliberately leaves no momentum. */
  rotate(yawDelta: number, pitchDelta: number) {
    if (![yawDelta, pitchDelta].every(Number.isFinite)) return;
    this.cancel();
    this.angleY += yawDelta;
    this.angleX = clamp(this.angleX + pitchDelta, MAX_PITCH);
  }

  reset() {
    this.cancel();
    this.angleY = 0;
    this.angleX = 0;
  }

  update(dtSeconds: number) {
    if (
      this.pointerActive ||
      this.reducedMotion ||
      !Number.isFinite(dtSeconds) ||
      dtSeconds <= 0
    )
      return;

    // Bound resume spikes. The renderer also resets its clock on visibility.
    const dt = Math.min(dtSeconds, MAX_FRAME_DELTA);
    const decay = Math.exp(-DAMPING * dt);
    const travel = (1 - decay) / DAMPING;
    this.angleY += this.velocityY * travel;
    this.angleX = clamp(this.angleX + this.velocityX * travel, MAX_PITCH);
    this.velocityY *= decay;
    this.velocityX *= decay;
    this.stopPitchAtBoundary();
    if (Math.abs(this.velocityY) < REST_VELOCITY) this.velocityY = 0;
    if (Math.abs(this.velocityX) < REST_VELOCITY) this.velocityX = 0;
  }

  setReducedMotion(value: boolean) {
    this.reducedMotion = value;
    if (value) this.clearVelocity();
  }

  private stopPitchAtBoundary() {
    if (
      (this.angleX >= MAX_PITCH && this.velocityX > 0) ||
      (this.angleX <= -MAX_PITCH && this.velocityX < 0)
    )
      this.velocityX = 0;
  }

  private clearVelocity() {
    this.velocityY = 0;
    this.velocityX = 0;
  }
}
