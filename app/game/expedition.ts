import type { DiscoveryId } from "../data/discoveries";
export const STAGE_LENGTH = 6270;
export const MAX_LEVEL = 3;
export function unlockedLevel(expeditions: number): number {
  return Math.min(MAX_LEVEL, Math.max(1, expeditions + 1));
}
export function levelSettings(level: number) {
  const normalized = Number.isFinite(level)
    ? Math.min(MAX_LEVEL, Math.max(1, Math.floor(level)))
    : 1;
  return {
    level: normalized,
    speed: RUN_SPEED + (normalized - 1) * 15,
    heightBonus: (normalized - 1) * 4,
  };
}
export const RUN_SPEED = 145;
export const JUMP_VELOCITY = -480;
export const GRAVITY = 1200;
export const obstacles = [
  900, 1850, 3450, 4100, 5000, 5700, 6500, 7650, 8350, 9000, 9720,
].map((x, i) => ({
  x: x * 0.6,
  width: i % 3 === 0 ? 38 : 30,
  height: i % 3 === 0 ? 34 : 27,
}));
export const collectibles: { id: DiscoveryId; x: number; elevated: boolean }[] =
  [
    { id: "strata", x: 288, elevated: false },
    { id: "ammonite", x: 954, elevated: true },
    { id: "fossil", x: 1518, elevated: false },
    { id: "fern", x: 2772, elevated: false },
    { id: "triceratops", x: 3720, elevated: true },
    { id: "rex", x: 4806, elevated: false },
  ];
export type Phase = "present" | "rewind" | "past" | "chase" | "ending";
export function phaseAt(distance: number): Phase {
  if (distance >= STAGE_LENGTH) return "ending";
  if (distance >= 4380) return "chase";
  if (distance >= 1920) return "past";
  if (distance >= 1620) return "rewind";
  return "present";
}
export class Expedition {
  x = 0;
  y = 0;
  velocity = 0;
  invulnerable = 0;
  bumps = 0;
  finished = false;
  found = new Set<DiscoveryId>();
  readonly settings;
  readonly obstacles;
  constructor(level = 1) {
    this.settings = levelSettings(level);
    this.obstacles = obstacles.map((obstacle) => ({
      ...obstacle,
      height: obstacle.height + this.settings.heightBonus,
    }));
  }
  private attempts = new Map<number, number>();
  jump() {
    if (this.y < -0.5 || this.finished) return false;
    this.velocity = JUMP_VELOCITY;
    return true;
  }
  update(dt: number): {
    bump: boolean;
    found: DiscoveryId[];
    assisted: boolean;
  } {
    const result = { bump: false, found: [] as DiscoveryId[], assisted: false };
    if (this.finished) return result;
    this.invulnerable = Math.max(0, this.invulnerable - dt);
    for (const obstacle of this.obstacles) {
      if (
        (this.attempts.get(obstacle.x) ?? 0) >= 3 &&
        obstacle.x - this.x > 30 &&
        obstacle.x - this.x < 90 &&
        this.y === 0
      ) {
        result.assisted = this.jump();
      }
    }
    this.x += this.settings.speed * dt;
    this.velocity += GRAVITY * dt;
    this.y = Math.min(0, this.y + this.velocity * dt);
    if (this.y === 0) this.velocity = 0;
    for (const obstacle of this.obstacles) {
      if (
        Math.abs(this.x - obstacle.x) < 14 + obstacle.width / 2 &&
        this.y > -obstacle.height + 3 &&
        !this.invulnerable
      ) {
        this.attempts.set(obstacle.x, (this.attempts.get(obstacle.x) ?? 0) + 1);
        this.x = Math.max(this.x > 1920 ? 1920 : 0, this.x - 130);
        this.invulnerable = 1.35;
        this.bumps++;
        result.bump = true;
        break;
      }
    }
    for (const item of collectibles) {
      // Ground discoveries are guaranteed; higher discoveries reward a timed jump.
      if (
        !this.found.has(item.id) &&
        Math.abs(this.x - item.x) < 42 &&
        (!item.elevated || this.y < -48)
      ) {
        this.found.add(item.id);
        result.found.push(item.id);
      }
    }
    if (this.x >= STAGE_LENGTH) this.finished = true;
    return result;
  }
}
