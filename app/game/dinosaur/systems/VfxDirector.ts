import Phaser from "phaser";
import { COLORS, PARTICLE_COUNTS, type Quality } from "../config/visual";
import type { Composition } from "./CameraDirector";
import type { SectionId } from "../types";
interface Particle {
  image: Phaser.GameObjects.Image;
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  duration: number;
  size: number;
}
export class VfxDirector {
  private particles: Particle[];
  private ambient: Phaser.GameObjects.Image[];
  private cursor = 0;
  private pulse: Phaser.GameObjects.Rectangle;
  private strip: Phaser.GameObjects.Rectangle;
  constructor(
    scene: Phaser.Scene,
    readonly reduced: boolean,
  ) {
    this.particles = Array.from({ length: 72 }, () => ({
      image: scene.add
        .image(0, 0, "dt-particle")
        .setVisible(false)
        .setDepth(14),
      active: false,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      age: 0,
      duration: 1,
      size: 1,
    }));
    this.ambient = Array.from({ length: 72 }, () =>
      scene.add.image(0, 0, "dt-particle").setDepth(9).setAlpha(0.18),
    );
    this.pulse = scene.add
      .rectangle(0, 0, 1, 1, COLORS.bone)
      .setOrigin(0)
      .setDepth(17)
      .setAlpha(0);
    this.strip = scene.add
      .rectangle(0, 0, 1, 1, COLORS.bone)
      .setOrigin(0)
      .setDepth(18)
      .setAlpha(0);
  }
  burst(x: number, y: number, count: number, death = false, scale = 1) {
    for (let i = 0; i < (this.reduced ? Math.ceil(count * 0.45) : count); i++) {
      const p = this.particles[this.cursor++ % this.particles.length]!;
      const a = (i / count) * Math.PI * 2 + this.cursor * 0.2;
      p.active = true;
      p.x = x;
      p.y = y;
      p.vx = Math.cos(a) * (death ? 155 : 50) * scale;
      p.vy = (Math.sin(a) * (death ? 175 : 42) - 50) * scale;
      p.age = 0;
      p.duration = death ? 0.52 : 0.28;
      p.size = (death ? 4 + (i % 4) : 2 + (i % 3)) * scale;
      p.image
        .setVisible(true)
        .setTint(death && i % 4 === 0 ? COLORS.iron : COLORS.bone)
        .setAlpha(1);
    }
  }
  render(
    c: Composition,
    t: number,
    delta: number,
    section: SectionId,
    quality: Quality,
    flash: number,
    deathAge: number,
  ) {
    for (const p of this.particles) {
      if (!p.active) continue;
      p.age += delta;
      if (p.age >= p.duration) {
        p.active = false;
        p.image.setVisible(false);
        continue;
      }
      p.x += p.vx * delta;
      p.y += p.vy * delta;
      p.vy += 420 * c.scale * delta;
      p.image
        .setPosition(p.x, p.y)
        .setDisplaySize(p.size, p.size * 0.6)
        .setRotation(p.age * 4)
        .setAlpha(1 - p.age / p.duration);
    }
    const count = PARTICLE_COUNTS[quality],
      fallout = section === "fallout",
      boundary = section === "boundary";
    this.ambient.forEach((p, i) => {
      p.setVisible(i < count);
      if (i >= count) return;
      const phase = i * 0.61803398875;
      const sx =
        ((((phase * c.width - (t * (fallout ? 80 : 24) + i * 43) * c.scale) %
          (c.width + 80)) +
          c.width +
          80) %
          (c.width + 80)) -
        40;
      const sy =
        (((i * 97 + t * (fallout ? 50 : boundary ? 15 : -8) * c.scale) %
          (c.height + 30)) +
          c.height +
          30) %
        (c.height + 30);
      p.setPosition(sx, sy)
        .setRotation(phase + t * 0.4)
        .setDisplaySize(
          (fallout ? 3.5 : 1.8) * c.scale,
          (fallout ? 6 : 1.5) * c.scale,
        )
        .setAlpha(fallout ? 0.55 : boundary ? 0.35 : 0.2)
        .setTint(fallout && i % 4 === 0 ? COLORS.impact : COLORS.bone);
    });
    this.pulse.setSize(c.width, c.height).setAlpha(flash);
    const stripAge = deathAge - 0.39;
    this.strip
      .setSize(c.width * Math.min(1, Math.max(0, stripAge / 0.2)), c.height)
      .setAlpha(stripAge > 0 ? Math.max(0, 1 - (deathAge - 0.67) / 0.09) : 0);
  }
  reset() {
    for (const p of this.particles) {
      p.active = false;
      p.image.setVisible(false);
    }
    this.strip.setAlpha(0);
  }
  get activeCount() {
    return this.particles.filter((p) => p.active).length;
  }
}
