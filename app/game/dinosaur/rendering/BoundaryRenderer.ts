import Phaser from "phaser";
import type { Composition } from "../systems/CameraDirector";
export class BoundaryRenderer {
  private white: Phaser.GameObjects.Rectangle;
  private line: Phaser.GameObjects.Rectangle;
  private layers: Phaser.GameObjects.Rectangle[];
  private ageLabel: Phaser.GameObjects.Text;
  private name: Phaser.GameObjects.Text;
  private complete: Phaser.GameObjects.Text;
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
    this.ageLabel = scene.add
      .text(0, 0, "66.0 Ma", {
        fontFamily: "Georgia, serif",
        fontSize: "54px",
        color: "#10110f",
      })
      .setDepth(24)
      .setAlpha(0);
    this.name = scene.add
      .text(0, 0, "CRETACEOUS — PALEOGENE\nBOUNDARY", {
        fontFamily: "monospace",
        fontSize: "11px",
        color: "#10110f",
        letterSpacing: 2,
        lineSpacing: 7,
      })
      .setDepth(24)
      .setAlpha(0);
    this.complete = scene.add
      .text(0, 0, "RUN COMPLETE", {
        fontFamily: "monospace",
        fontSize: "13px",
        color: "#10110f",
        letterSpacing: 4,
      })
      .setDepth(24)
      .setAlpha(0);
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
    const labelAlpha = Math.max(0, Math.min(1, (t - 75.25) / 0.5));
    this.ageLabel
      .setPosition(c.width * 0.08, c.height * 0.27)
      .setFontSize(c.width < 700 ? 52 : 92)
      .setAlpha(labelAlpha);
    this.name
      .setPosition(c.width * 0.085, c.height * 0.4)
      .setFontSize(c.width < 700 ? 10 : 12)
      .setAlpha(labelAlpha);
    this.complete
      .setPosition(c.width * 0.085, c.height * 0.82)
      .setAlpha(Math.max(0, Math.min(1, (t - 76.1) / 0.4)));
  }
}
