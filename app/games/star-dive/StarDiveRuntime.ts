import {
  DURATION,
  type Entity,
  type Projectile,
  type DiveEvent,
  type EventKind,
  type Snapshot,
} from "./config";
import { StageClock } from "./StageClock";
import { PlayerController, CameraRig } from "./player";
import { ScoreSystem } from "./gameplay/ScoreSystem";
import { patterns } from "./gameplay/patterns";
import { ExperienceDirector } from "./ExperienceDirector";
export class StarDiveRuntime {
  readonly player = new PlayerController();
  readonly camera = new CameraRig();
  readonly score = new ScoreSystem();
  readonly director = new ExperienceDirector();
  entities: Entity[] = [];
  shots: Projectile[] = [];
  events: DiveEvent[] = [];
  finished = false;
  cleared = false;
  gateOpen = false;
  gateKills = 0;
  discovered = false;
  invincible = false;
  private serial = 0;
  private cursor = 0;
  private fire = 0;
  private burst = false;
  constructor(readonly clock = new StageClock()) {}
  private event(
    kind: EventKind,
    x = 0,
    y = 0,
    z = 0,
    points = 0,
    big = false,
    label?: string,
  ) {
    this.events.push({
      id: ++this.serial,
      kind,
      time: this.clock.time,
      x,
      y,
      z,
      points,
      big,
      label,
    });
  }
  update(dt: number, reduced = false) {
    if (this.clock.paused || this.finished) return;
    const time = Math.min(DURATION, this.clock.time);
    dt = Math.min(0.05, dt);
    this.events = this.events.filter((e) => time - e.time < 0.85);
    this.score.update(time);
    this.player.update(dt);
    if (this.director.update(time)) {
      this.event("section", 0, 0, 0, 0, false, this.director.section);
      if (this.director.section === "asteroid-field") {
        this.discovered = true;
        this.event("discovery");
      }
    }
    if (time >= 70 && !this.burst) {
      this.burst = true;
      this.event("climax");
    }
    this.camera.update(
      this.player,
      dt,
      this.director.section === "inside",
      reduced,
    );
    while (
      this.cursor < patterns.length &&
      patterns[this.cursor]!.time <= time
    ) {
      const p = patterns[this.cursor++]!;
      if (
        p.kind !== "asteroid" &&
        this.entities.filter((e) => e.kind !== "asteroid").length >= 3
      )
        continue;
      const radius = p.radius ?? (p.kind === "shard" ? 0.4 : 0.65);
      this.entities.push({
        id: ++this.serial,
        kind: p.kind,
        x: p.x,
        y: p.y,
        z: -45,
        born: p.time,
        hp: p.kind === "core" ? 3 : p.kind === "gate" ? 3 : 1,
        radius,
        nearRadius: radius + 0.75,
        minDistance: Infinity,
        touched: false,
        passed: false,
      });
    }
    const previousZ = new Map(this.entities.map((e) => [e.id, e.z]));
    for (const e of this.entities) e.z = -45 + (time - e.born) * 14;
    this.fire -= dt;
    if (this.fire <= 0 && time < 77) {
      this.fire = 0.18;
      const aim = this.entities.find(
        (e) =>
          e.kind !== "asteroid" &&
          e.z < -3 &&
          Math.hypot(e.x - this.player.x, e.y - this.player.y) < 0.7,
      );
      this.shots.push({
        id: ++this.serial,
        x: this.player.x + (aim ? (aim.x - this.player.x) * 0.3 : 0),
        y: this.player.y + (aim ? (aim.y - this.player.y) * 0.3 : 0),
        z: 0,
        age: 0,
      });
      this.event("shot", this.player.x, this.player.y, 0);
    }
    const dead = new Set<number>();
    for (const shot of this.shots) {
      const oldShotZ = shot.z;
      shot.z -= dt * (time > 70 ? 70 : 50);
      shot.age += dt;
      for (const e of this.entities) {
        const before = oldShotZ - (previousZ.get(e.id) ?? e.z),
          after = shot.z - e.z;
        const distanceZ =
          before * after <= 0 ? 0 : Math.min(Math.abs(before), Math.abs(after));
        if (
          dead.has(e.id) ||
          distanceZ > 1.3 ||
          Math.hypot(shot.x - e.x, shot.y - e.y) > e.radius + 0.12
        )
          continue;
        dead.add(shot.id);
        if (e.kind === "asteroid") {
          this.event("hit", e.x, e.y, e.z);
          break;
        }
        e.hp--;
        this.event("hit", e.x, e.y, e.z);
        if (e.hp <= 0) {
          dead.add(e.id);
          const points = this.score.destroy(e.kind, time);
          this.event(
            "destroy",
            e.x,
            e.y,
            e.z,
            points,
            e.kind !== "shard" || this.score.chain === 3,
          );
          if (e.kind === "gate") {
            this.gateKills++;
            if (this.gateKills >= 3) {
              this.gateOpen = true;
              this.event("gate", 0, 0, -12, 1500, true);
              this.score.score += 1500;
            }
          }
        }
        break;
      }
    }
    for (const e of this.entities) {
      if (e.kind !== "asteroid" || e.passed) continue;
      const oldZ = previousZ.get(e.id) ?? e.z;
      const closestZ =
        oldZ <= 0 && e.z >= 0 ? 0 : Math.min(Math.abs(oldZ), Math.abs(e.z));
      const d = Math.hypot(e.x - this.player.x, e.y - this.player.y, closestZ);
      e.minDistance = Math.min(e.minDistance, d);
      if (d < e.radius + 0.22) {
        e.touched = true;
        if (!this.invincible && this.player.damage()) {
          this.score.damage();
          this.event("damage", this.player.x, this.player.y, 0);
        }
      }
      if (e.z > 1.5) {
        e.passed = true;
        if (!e.touched && e.minDistance < e.nearRadius + 0.22) {
          this.score.recordNear();
          this.event(
            "near",
            e.x,
            e.y,
            0,
            0,
            false,
            `RISK x${this.score.risk.toFixed(1)}`,
          );
        }
      }
    }
    this.entities = this.entities.filter((e) => e.z < 5 && !dead.has(e.id));
    this.shots = this.shots.filter((s) => s.z > -60 && !dead.has(s.id));
    if (time >= 57.3 && !this.gateOpen) {
      this.gateOpen = true;
      this.event("gate", 0, 0, -12, 0, true);
    }
    if (this.player.shield === 0 || time >= DURATION) {
      this.finished = true;
      this.cleared = this.player.shield > 0;
      if (this.cleared) this.score.clear(this.player.shield);
    }
  }
  snapshot(quality = "medium"): Snapshot {
    return {
      time: Math.min(80, this.clock.time),
      section: this.director.section,
      shield: this.player.shield,
      score: this.score.score,
      chain: this.score.chain,
      maxChain: this.score.maxChain,
      near: this.score.nearCount,
      risk: this.score.risk,
      gateOpen: this.gateOpen,
      finished: this.finished,
      cleared: this.cleared,
      event: [...this.events]
        .reverse()
        .find((e) => e.kind !== "shot" && e.kind !== "hit"),
      quality,
    };
  }
  seek(time: number) {
    this.clock.seek(time);
    this.cursor = patterns.findIndex((p) => p.time >= time);
    if (this.cursor < 0) this.cursor = patterns.length;
    this.entities = [];
    this.shots = [];
    this.events = [];
    this.burst = time >= 70;
    this.director.update(time);
  }
  dispose() {
    this.clock.pause();
    this.director.dispose();
    this.entities = [];
    this.shots = [];
    this.events = [];
  }
}
