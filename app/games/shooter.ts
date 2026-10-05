export interface Target {
  id: number;
  x: number;
  y: number;
  z: number;
  kind: "enemy" | "rock" | "item";
}
export interface Shot {
  id: number;
  x: number;
  y: number;
  z: number;
}
export class Shooter {
  x = 0;
  y = 0;
  elapsed = 0;
  shield = 3;
  score = 0;
  combo = 0;
  invulnerable = 0;
  finished = false;
  targets: Target[] = [];
  shots: Shot[] = [];
  private spawn = 0;
  private fire = 0;
  private serial = 0;
  move(x: number, y: number) {
    this.x = Math.max(-3, Math.min(3, x));
    this.y = Math.max(-2, Math.min(2, y));
  }
  update(dt: number) {
    if (this.finished) return;
    dt = Math.min(dt, 0.05);
    this.elapsed += dt;
    this.invulnerable = Math.max(0, this.invulnerable - dt);
    this.spawn -= dt;
    this.fire -= dt;
    if (this.fire <= 0) {
      this.fire = 0.18;
      this.shots.push({ id: ++this.serial, x: this.x, y: this.y, z: 0 });
    }
    if (this.spawn <= 0) {
      this.spawn = 0.85;
      const n = Math.floor(this.elapsed / 0.85);
      this.targets.push({
        id: ++this.serial,
        x: Math.sin(n * 2.4) * 2.7,
        y: Math.cos(n * 1.7) * 1.7,
        z: -38,
        kind: n % 7 === 0 ? "item" : n % 3 === 0 ? "rock" : "enemy",
      });
    }
    for (const shot of this.shots) shot.z -= dt * 32;
    const removed = new Set<number>();
    for (const target of this.targets) {
      target.z += dt * 12;
      if (
        target.kind === "enemy" &&
        this.shots.some(
          (s) =>
            !removed.has(s.id) &&
            Math.abs(s.z - target.z) < 1.2 &&
            Math.hypot(s.x - target.x, s.y - target.y) < 0.65 &&
            (removed.add(s.id), true),
        )
      ) {
        removed.add(target.id);
        this.combo++;
        this.score += 100 + Math.min(this.combo, 10) * 20;
        continue;
      }
      if (
        Math.abs(target.z) < 0.8 &&
        Math.hypot(this.x - target.x, this.y - target.y) < 0.8
      ) {
        if (target.kind === "item") {
          this.score += 250;
          removed.add(target.id);
        } else if (!this.invulnerable) {
          this.shield--;
          this.combo = 0;
          this.invulnerable = 1.4;
          removed.add(target.id);
        }
      }
    }
    this.targets = this.targets.filter((t) => t.z < 3 && !removed.has(t.id));
    this.shots = this.shots.filter((s) => s.z > -45 && !removed.has(s.id));
    if (this.shield <= 0 || this.elapsed >= 40) {
      this.finished = true;
      if (this.shield > 0)
        this.score +=
          this.shield * 500 + Math.max(0, Math.round(45 - this.elapsed)) * 20;
    }
  }
}
