import Phaser from "phaser";
import type { Composition } from "../systems/CameraDirector";
import { obstacleTop, type FixedStepWorld } from "../systems/FixedStepWorld";
import type { Obstacle, TerrainSegment } from "../types";
export class TerrainRenderer {
  private ground: Phaser.GameObjects.Image[];
  private obstacles: Phaser.GameObjects.Image[];
  private patches: Phaser.GameObjects.Rectangle[];
  private edges: Phaser.GameObjects.Rectangle[];
  private debug: Phaser.GameObjects.Graphics;
  constructor(scene: Phaser.Scene) {
    this.ground = Array.from({ length: 8 }, () =>
      scene.add.image(0, 0, "dt-ground").setOrigin(0).setDepth(1),
    );
    this.obstacles = Array.from({ length: 24 }, () =>
      scene.add
        .image(0, 0, "dt-rock")
        .setOrigin(0.5, 1)
        .setDepth(5)
        .setVisible(false),
    );
    this.patches = Array.from({ length: 18 }, () =>
      scene.add
        .rectangle(0, 0, 1, 1, 0x10110f)
        .setOrigin(0)
        .setDepth(2)
        .setVisible(false),
    );
    this.edges = Array.from({ length: 18 }, () =>
      scene.add
        .rectangle(0, 0, 1, 1, 0xb7a68a)
        .setOrigin(0)
        .setDepth(3)
        .setVisible(false),
    );
    this.debug = scene.add.graphics().setDepth(30);
  }
  render(c: Composition, world: FixedStepWorld, hitboxes: boolean) {
    const s = c.scale,
      x = world.state.worldX,
      t = world.clock.elapsedSeconds;
    const near = world.spatial.near(
      x,
      c.playerX / s + 100,
      (c.width - c.playerX) / s + 150,
    );
    const period = 512 * s,
      offset = (((x * s - c.playerX) % period) + period) % period;
    this.ground.forEach((image, i) => {
      const px = (i - 1) * period - offset;
      image
        .setPosition(px, c.floor)
        .setDisplaySize(period, period)
        .setVisible(px < c.width && px + period > 0);
    });
    this.obstacles.forEach((image, i) => {
      const o = near.obstacles[i];
      image.setVisible(!!o);
      if (o)
        image
          .setTexture(`dt-${o.kind === "falling" ? "rock" : o.kind}`)
          .setPosition(
            c.playerX + (o.x - x) * s,
            c.floor + (obstacleTop(o, t) + o.height) * s,
          )
          .setDisplaySize((o.width + 9) * s, (o.height + 8) * s)
          .setTint(o.kind === "falling" ? 0xb7a68a : 0xffffff);
    });
    this.patches.forEach((patch, i) => {
      const p = near.terrain[i];
      patch.setVisible(!!p);
      this.edges[i]!.setVisible(!!p);
      if (!p) return;
      const gap = p.gap && (p.collapseAt === undefined || t >= p.collapseAt);
      const px = c.playerX + (p.start - x) * s,
        w = (p.end - p.start) * s;
      patch
        .setPosition(px, c.floor + (gap ? 0 : Math.min(0, p.y)) * s)
        .setSize(w, gap ? c.height - c.floor : (Math.abs(p.y) + 28) * s)
        .setFillStyle(gap ? 0x292b25 : p.gap ? 0x45483b : 0x10110f);
      this.edges[i]!.setVisible(!gap)
        .setPosition(px, c.floor + p.y * s)
        .setSize(w, 2 * s);
    });
    this.debug.clear();
    if (!hitboxes) return;
    this.debug.lineStyle(1, 0x00ffb2, 0.85);
    this.debug.strokeRect(
      c.playerX - 10.64 * s,
      c.floor + (world.state.playerY - 51) * s,
      21.28 * s,
      51 * s,
    );
    for (const o of near.obstacles) {
      const inset = o.kind === "branch" ? 6 : 3;
      this.debug.strokeRect(
        c.playerX + (o.x - x - o.width / 2 + inset) * s,
        c.floor + (obstacleTop(o, t) + 5) * s,
        (o.width - inset * 2) * s,
        (o.height - 5) * s,
      );
    }
    for (const p of near.terrain) {
      this.debug.lineStyle(2, p.gap ? 0xff6666 : 0x00ffb2);
      this.debug.lineBetween(
        c.playerX + (p.start - x) * s,
        c.floor + p.y * s,
        c.playerX + (p.end - x) * s,
        c.floor + p.y * s,
      );
    }
  }
}
