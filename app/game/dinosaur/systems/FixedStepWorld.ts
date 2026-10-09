import {
  BUFFER_SECONDS,
  COLLISION_WIDTH,
  COYOTE_SECONDS,
  DURATION,
  FIXED_DT,
  GRAVITY,
  JUMP_VELOCITY,
  MAX_FRAME_DELTA,
  MAX_SUBSTEPS,
  PLAYER_HEIGHT,
  SAFE_END,
  speedAt,
} from "../config/gameplay";
import { StageClock } from "./StageClock";
import { SpatialSectionSystem } from "./SpatialSectionSystem";
import type { Level, Obstacle } from "../types";
export interface WorldState {
  worldX: number;
  playerY: number;
  playerVelocityY: number;
  grounded: boolean;
  coyoteRemaining: number;
  jumpBufferRemaining: number;
  alive: boolean;
  elapsedFixedSteps: number;
}
export function obstacleTop(o: Obstacle, t: number): number {
  return o.kind === "falling"
    ? -o.height - Math.max(0, 1 - (t - (o.at ?? 0)) / 0.65) ** 2 * 220
    : -o.height;
}
export function intersectsObstacle(
  x: number,
  y: number,
  o: Obstacle,
  t: number,
): boolean {
  const top = obstacleTop(o, t),
    inset = o.kind === "branch" ? 6 : 3;
  return (
    x + COLLISION_WIDTH / 2 > o.x - o.width / 2 + inset &&
    x - COLLISION_WIDTH / 2 < o.x + o.width / 2 - inset &&
    y > top + 5 &&
    y - PLAYER_HEIGHT + 3 < top + o.height
  );
}
export class FixedStepWorld {
  state: WorldState = this.initial();
  readonly clock = new StageClock();
  readonly spatial: SpatialSectionSystem;
  private accumulator = 0;
  private inputs: { tick: number; at: number }[] = [];
  private bufferInputAt = 0;
  private inputCursor = 0;
  jumped = false;
  landed = false;
  onJump?: (at: number, inputAt: number) => void;
  onLand?: () => void;
  onDeath?: () => void;
  previewInvincible = false;
  constructor(readonly level: Level) {
    this.spatial = new SpatialSectionSystem(level);
  }
  private initial(): WorldState {
    return {
      worldX: 0,
      playerY: 0,
      playerVelocityY: 0,
      grounded: true,
      coyoteRemaining: COYOTE_SECONDS,
      jumpBufferRemaining: 0,
      alive: true,
      elapsedFixedSteps: 0,
    };
  }
  queueJump(at = this.clock.elapsedSeconds) {
    const tick = Math.max(this.clock.ticks, Math.ceil((at - 1e-9) / FIXED_DT));
    this.inputs.push({ tick, at });
    this.inputs.sort((a, b) => a.tick - b.tick);
  }
  advance(
    deltaSeconds: number,
    afterStep?: (previous: number, current: number) => void,
  ) {
    // Retain the backlog: a slow render never silently skips authored simulation.
    this.accumulator += Math.max(0, deltaSeconds);
    let remaining = Math.min(
      MAX_SUBSTEPS,
      Math.floor(
        (Math.min(this.accumulator, MAX_FRAME_DELTA) + 1e-9) / FIXED_DT,
      ),
    );
    while (
      remaining-- > 0 &&
      this.state.alive &&
      this.clock.elapsedSeconds < DURATION - 1e-9
    ) {
      const previous = this.clock.elapsedSeconds;
      this.step();
      this.accumulator -= FIXED_DT;
      afterStep?.(previous, this.clock.elapsedSeconds);
    }
    if (!this.state.alive || this.clock.elapsedSeconds >= DURATION - 1e-9)
      this.accumulator = 0;
  }
  step() {
    const s = this.state,
      t = this.clock.elapsedSeconds;
    this.jumped = false;
    this.landed = false;
    while (
      this.inputCursor < this.inputs.length &&
      this.inputs[this.inputCursor]!.tick <= this.clock.ticks
    ) {
      s.jumpBufferRemaining = BUFFER_SECONDS;
      this.bufferInputAt = this.inputs[this.inputCursor]!.at;
      this.inputCursor++;
    }
    const floorBefore = this.spatial.terrainAt(s.worldX, t);
    if (s.grounded && floorBefore === null) s.grounded = false;
    if (s.grounded) s.coyoteRemaining = COYOTE_SECONDS;
    else s.coyoteRemaining = Math.max(0, s.coyoteRemaining - FIXED_DT);
    if (s.jumpBufferRemaining > 0 && (s.grounded || s.coyoteRemaining > 0)) {
      s.playerVelocityY = JUMP_VELOCITY;
      s.grounded = false;
      s.coyoteRemaining = 0;
      s.jumpBufferRemaining = 0;
      this.jumped = true;
      this.onJump?.(t, this.bufferInputAt);
    }
    s.jumpBufferRemaining = Math.max(0, s.jumpBufferRemaining - FIXED_DT);
    const previousY = s.playerY;
    s.worldX += speedAt(t, this.level.speeds) * FIXED_DT;
    const floor = this.spatial.terrainAt(s.worldX, t);
    s.playerVelocityY += GRAVITY * FIXED_DT;
    s.playerY += s.playerVelocityY * FIXED_DT;
    if (
      floor !== null &&
      s.playerVelocityY >= 0 &&
      previousY <= floor + (s.grounded ? 8 : 0) &&
      s.playerY >= floor
    ) {
      this.landed = !s.grounded;
      s.playerY = floor;
      s.playerVelocityY = 0;
      s.grounded = true;
      s.coyoteRemaining = COYOTE_SECONDS;
      if (this.landed) this.onLand?.();
    } else s.grounded = false;
    if (
      !this.previewInvincible &&
      t < SAFE_END &&
      (s.playerY > 135 ||
        (floor !== null && floor < previousY - 8 && s.playerY > floor + 5) ||
        this.spatial
          .obstaclesAt(s.worldX)
          .some((o) => intersectsObstacle(s.worldX, s.playerY, o, t)))
    ) {
      s.alive = false;
      this.onDeath?.();
    }
    // Preview is deliberately outside production; ending cannot fail after final landing.
    if ((t >= SAFE_END || this.previewInvincible) && s.playerY > 135) {
      s.playerY = floor ?? 0;
      s.playerVelocityY = 0;
      s.grounded = true;
    }
    this.clock.ticks++;
    s.elapsedFixedSteps = this.clock.ticks;
  }
  reset() {
    this.state = this.initial();
    this.clock.reset();
    this.accumulator = 0;
    this.inputs.length = 0;
    this.inputCursor = 0;
    this.bufferInputAt = 0;
    this.jumped = false;
    this.landed = false;
  }
  clearAccumulator() {
    this.accumulator = 0;
  }
}
