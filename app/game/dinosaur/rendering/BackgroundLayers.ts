import Phaser from "phaser";
import { PARALLAX } from "../config/visual";
import type { Composition } from "../systems/CameraDirector";
import type { SectionId } from "../types";
// Repeating plates use pooled Images. TileSprite's dirty path reuploads its
// backing canvas when tilePosition changes, which is costly on mobile GPUs.
export class BackgroundLayers {
  private sky: Phaser.GameObjects.Image;
  private sun: Phaser.GameObjects.Image;
  private layers: Phaser.GameObjects.Image[][];
  private label: Phaser.GameObjects.Text;
  private classification: Phaser.GameObjects.Text;
  private grain: Phaser.GameObjects.Image;
  private fore: Phaser.GameObjects.Image[];
  constructor(scene: Phaser.Scene) {
    this.sky = scene.add.image(0, 0, "dt-sky").setOrigin(0).setDepth(-20);
    this.sun = scene.add.image(0, 0, "dt-sun").setDepth(-19);
    this.label = scene.add
      .text(0, 0, "HELL\nCREEK", {
        fontFamily: "Georgia, serif",
        fontSize: "112px",
        color: "#e9e4d8",
        lineSpacing: -16,
      })
      .setAlpha(0.36)
      .setDepth(-18);
    this.classification = scene.add
      .text(0, 0, "FORMATION  /  MONTANA\nLATE CRETACEOUS · 66.0 Ma", {
        fontFamily: "monospace",
        fontSize: "11px",
        color: "#e9e4d8",
        lineSpacing: 8,
        letterSpacing: 2,
      })
      .setAlpha(0.7)
      .setDepth(-9);
    this.layers = ["dt-geology", "dt-mass", "dt-forest"].map((k, i) =>
      Array.from({ length: 4 }, () =>
        scene.add
          .image(0, 0, k)
          .setOrigin(0, 1)
          .setDepth(-16 + i),
      ),
    );
    this.fore = Array.from({ length: 8 }, () =>
      scene.add
        .image(0, 0, "dt-fern")
        .setOrigin(0, 1)
        .setDepth(12)
        .setAlpha(0.88),
    );
    this.grain = scene.add
      .image(0, 0, "dt-grain")
      .setOrigin(0)
      .setDepth(19)
      .setAlpha(0.18);
  }
  render(
    c: Composition,
    x: number,
    t: number,
    section: SectionId,
    tint: number,
    reduced: boolean,
    low: boolean,
  ) {
    const { width: w, height: h, scale: s, floor } = c;
    const ash = ["flash", "fallout", "boundary"].includes(section),
      skyKey = ash ? "dt-sky-ash" : "dt-sky";
    if (this.sky.texture.key !== skyKey) this.sky.setTexture(skyKey);
    this.sky.setDisplaySize(w, h).setTint(tint);
    this.sun
      .setPosition(w * 0.78, h * 0.34)
      .setDisplaySize(w * 0.75, w * 0.75)
      .setAlpha(
        section === "boundary" ? 0.08 : section === "fallout" ? 0.2 : 0.65,
      );
    const text =
      section === "predator"
        ? "TYRANNO\nSAURUS"
        : section === "fallout"
          ? "THE\nLAST DAY"
          : section === "boundary"
            ? "DEEP\nTIME"
            : "HELL\nCREEK";
    if (this.label.text !== text) this.label.setText(text);
    this.label
      .setFontSize(w < 700 ? w * 0.235 : Math.min(w * 0.16, 190))
      .setPosition(w * 0.055, h * 0.2)
      .setAlpha(section === "boundary" ? 0.17 : 0.32);
    this.classification
      .setPosition(w * 0.06, h * 0.17)
      .setFontSize(w < 700 ? 10 : 12)
      .setText(
        section === "predator"
          ? "THEROPODA / TYRANNOSAURIDAE\nHELL CREEK FORMATION"
          : section === "fallout"
            ? "EJECTA / ASH / IRIDIUM\nCRETACEOUS · LAST DAY"
            : "FORMATION / MONTANA\nLATE CRETACEOUS · 66.0 Ma",
      );
    const ratios = [PARALLAX.geology, PARALLAX.mountains, PARALLAX.forest];
    this.layers.forEach((images, i) => {
      const factor = [1.15, 1, 0.62][i]!,
        period = 1536 * s * factor;
      const offset = (x * ratios[i]! * s * (reduced ? 0.45 : 1)) % period;
      const key =
        ["dt-geology", "dt-mass", "dt-forest"][i]! + (ash ? "-ash" : "");
      images.forEach((image, j) => {
        if (image.texture.key !== key) image.setTexture(key);
        const px = (j - 1) * period - offset;
        image
          .setVisible(px < w && px + period > 0)
          .setPosition(px, floor + 40 * s)
          .setDisplaySize(period, 560 * s * factor)
          .setTint(tint)
          .setAlpha(
            section === "boundary" ? Math.max(0.08, 1 - (t - 66) / 7) : 1,
          );
      });
    });
    const period = 512 * s,
      offset = (x * PARALLAX.foreground * s) % period;
    this.fore.forEach((image, i) => {
      const px = (i - 1) * period - offset;
      image
        .setVisible(!low && section !== "boundary" && px < w && px + period > 0)
        .setPosition(px, h + 70 * s)
        .setDisplaySize(period, 240 * s);
    });
    this.grain.setDisplaySize(w, h);
  }
}
