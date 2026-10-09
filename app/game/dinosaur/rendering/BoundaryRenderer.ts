import Phaser from "phaser";
import type { Composition } from "../systems/CameraDirector";
export class BoundaryRenderer {
  private white: Phaser.GameObjects.Rectangle;
  private line: Phaser.GameObjects.Rectangle;
  private layers: Phaser.GameObjects.Rectangle[];
  constructor(scene: Phaser.Scene) {
    this.white = scene.add
      .rectangle(0, 0, 1, 1, 0xe9e4d8)
      .setOrigin(0)
      .setDepth(20)
      .setAlpha(0);
    this.layers = Array.from({ length: 12 }, (_, i) =>
      scene.add
        .rectangle(0, 0, 1, 1, [0xb7a68a, 0xa89980, 0xc8bca5, 0x9d927d][i % 4]!)
        .setOrigin(0)
        .setDepth(21)
        .setVisible(false),
    );
    this.line = scene.add
      .rectangle(0, 0, 1, 2, 0x10110f)
      .setOrigin(0)
      .setDepth(23)
      .setVisible(false);
  }
  render(c: Composition, t: number) {
    const a = Math.max(0, Math.min(1, (t - 72.8) / 1.25)),
      reveal = Math.max(0, Math.min(1, (t - 75) / 1.2));
    this.white.setSize(c.width, c.height).setAlpha(a);
    this.line
      .setVisible(t >= 74.4)
      .setPosition(0, c.height * 0.58)
      .setSize(c.width, Math.max(2, 4 * c.scale));
    this.layers.forEach((r, i) =>
      r
        .setVisible(reveal > 0)
        .setPosition(0, c.height * 0.58 + (i - 5) * 23 * c.scale * reveal)
        .setSize(c.width, 21 * c.scale * reveal)
        .setAlpha(reveal * 0.85),
    );
  }
}
