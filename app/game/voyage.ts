import type { DiscoveryId } from "../data/discoveries";
export type VoyageWorld = "space" | "ocean";
export type VoyagePhase = "start" | "middle" | "deep" | "encounter" | "ending";
export const VOYAGE_LENGTH = 10080;
export const VOYAGE_SPEED = 140;
export const voyageObstacles = [1000, 2400, 3700, 5350, 7100, 9100].map(
  (x, i) => ({
    x,
    width: 34,
    height: 30,
    y: i === 3 || i === 5 ? -215 : 0,
  }),
);
export function voyageCollectibles(world: VoyageWorld) {
  const ids: DiscoveryId[] =
    world === "space"
      ? ["moon", "earth", "saturn", "comet", "nebula", "blackhole"]
      : ["coral", "jellyfish", "turtle", "anglerfish", "vent", "whale"];
  return ids.map((id, i) => ({
    id,
    x: [480, 1650, 3050, 4660, 6350, 8150][i]!,
    elevated: i === 1 || i === 4,
  }));
}
export function voyagePhaseAt(x: number): VoyagePhase {
  if (x >= VOYAGE_LENGTH) return "ending";
  if (x >= 7600) return "encounter";
  if (x >= 5100) return "deep";
  if (x >= 2700) return "middle";
  return "start";
}
export class Voyage {
  x = 0;
  y = 0;
  velocity = 0;
  invulnerable = 0;
  bumps = 0;
  finished = false;
  found = new Set<DiscoveryId>();
  readonly collectibles;
  readonly gravity;
  readonly thrust;
  private attempts = new Map<number, number>();
  constructor(readonly world: VoyageWorld) {
    this.collectibles = voyageCollectibles(world);
    this.gravity = world === "space" ? 360 : 500;
    this.thrust = world === "space" ? -300 : -255;
  }
  boost() {
    if (this.finished) return false;
    // Jets and swimming can act while drifting, unlike a ground jump.
    this.velocity = this.thrust;
    return true;
  }
  update(dt: number) {
    const result = { bump: false, assisted: false, found: [] as DiscoveryId[] };
    if (this.finished) return result;
    this.invulnerable = Math.max(0, this.invulnerable - dt);
    for (const obstacle of voyageObstacles) {
      if (
        (this.attempts.get(obstacle.x) ?? 0) >= 3 &&
        obstacle.x - this.x > 30 &&
        obstacle.x - this.x < 100
      ) {
        this.invulnerable = 1.5;
        if (obstacle.y === 0) this.boost();
        result.assisted = true;
      }
    }
    this.x += VOYAGE_SPEED * dt;
    this.velocity += this.gravity * dt;
    this.y = Math.max(-230, Math.min(0, this.y + this.velocity * dt));
    if (this.y === 0 || this.y === -230) this.velocity = 0;
    for (const obstacle of voyageObstacles) {
      if (
        !this.invulnerable &&
        Math.abs(this.x - obstacle.x) < 14 + obstacle.width / 2 &&
        this.y > obstacle.y - obstacle.height + 3 &&
        this.y - 40 < obstacle.y
      ) {
        this.attempts.set(obstacle.x, (this.attempts.get(obstacle.x) ?? 0) + 1);
        this.x = Math.max(0, this.x - 130);
        this.invulnerable = 1.35;
        this.bumps++;
        result.bump = true;
        break;
      }
    }
    for (const item of this.collectibles) {
      if (
        !this.found.has(item.id) &&
        Math.abs(this.x - item.x) < 42 &&
        (!item.elevated || this.y < -48)
      ) {
        this.found.add(item.id);
        result.found.push(item.id);
      }
    }
    if (this.x >= VOYAGE_LENGTH) this.finished = true;
    return result;
  }
}
