import Phaser from "phaser";
import type { Composition } from "../systems/CameraDirector";
import type { SectionId } from "../types";
interface Encounter {
  name: string;
  at: number;
}
export class DinosaurRenderer {
  private encounters: Encounter[] = [];
  private herd: Phaser.GameObjects.Image[];
  private rex: Phaser.GameObjects.Image[];
  constructor(scene: Phaser.Scene) {
    this.herd = Array.from({ length: 8 }, () =>
      scene.add
        .image(0, 0, "dt-tri-far-0")
        .setOrigin(0.5, 1)
        .setDepth(-11)
        .setVisible(false),
    );
    this.rex = ["far", "mid", "near"].map((d, i) =>
      scene.add
        .image(0, 0, `dt-rex-${d}-0`)
        .setOrigin(0.5, 1)
        .setDepth(-12 + i)
        .setVisible(false),
    );
  }
  cue(name: string, at: number) {
    this.encounters.push({ name, at });
  }
  private age(name: string, t: number) {
    const e = this.encounters.find((e) => e.name === name);
    return e ? t - e.at : -1;
  }
  render(c: Composition, t: number, section: SectionId, low: boolean) {
    const { width: w, height: h, scale: s, floor } = c;
    const frozen = t >= 38.4 && t < 38.75;
    const poseTime = frozen ? 38.4 : t;
    const frame = Math.floor(poseTime * 7) % 4;
    this.herd.forEach((image) => image.setVisible(false));
    this.rex.forEach((image) => image.setVisible(false));
    const far = this.age("herd-far", poseTime),
      mid = this.age("herd-mid", poseTime),
      cross = this.age("herd-cross", poseTime),
      flight = this.age("herd-flight", poseTime);
    if (far >= 0 && far < 29)
      for (let i = 0; i < (low ? 3 : 5); i++) {
        this.herd[i]!.setTexture(`dt-tri-far-${frame}`)
          .setVisible(true)
          .setDepth(-13)
          .setPosition(
            w * 0.28 + i * 90 * s - far * 9 * s,
            floor - 160 * s + Math.sin(poseTime * 6 + i) * s,
          )
          .setDisplaySize(100 * s, 53 * s)
          .setAlpha(section === "flash" ? 0.28 : 0.5);
      }
    if (mid >= 0 && mid < 17)
      for (let i = 0; i < 2; i++)
        this.herd[i + 5]!.setTexture(`dt-tri-mid-${frame}`)
          .setVisible(true)
          .setDepth(-10)
          .setPosition(
            w + 110 * s + i * 205 * s - mid * 47 * s,
            floor - 35 * s + Math.sin(poseTime * 6) * 2 * s,
          )
          .setDisplaySize(200 * s, 106 * s)
          .setAlpha(0.94);
    if (cross >= 0 && cross < 4.6)
      this.herd[7]!.setTexture(`dt-tri-near-${frame}`)
        .setVisible(true)
        .setDepth(11)
        .setPosition(w + 250 * s - (cross * (w + 700 * s)) / 4.6, h + 142 * s)
        .setDisplaySize(445 * s, 237 * s)
        .setAlpha(0.93);
    if (flight >= 0 && flight < 8)
      for (let i = 0; i < 2; i++)
        this.herd[5 + i]!.setTexture(`dt-tri-mid-${frame}`)
          .setVisible(true)
          .setDepth(-10)
          .setPosition(
            w + 220 * s + i * 240 * s - flight * 110 * s,
            floor - 32 * s,
          )
          .setDisplaySize(180 * s, 96 * s)
          .setAlpha(0.5);
    const distant = this.age("rex-far", poseTime),
      reveal = this.age("rex-mid", poseTime),
      pressure = this.age("rex-pressure", poseTime),
      chase = this.age("rex-chase", poseTime);
    if (distant >= 0 && distant < 2.7)
      this.rex[0]!.setTexture(`dt-rex-far-${frame}`)
        .setVisible(true)
        .setPosition(w * 0.78 - distant * 14 * s, floor - 170 * s)
        .setDisplaySize(146 * s, 74 * s)
        .setAlpha(0.7 * Math.min(1, Math.max(0, (2.7 - distant) / 0.3)));
    if (reveal >= 0 && reveal < 3.5)
      this.rex[1]!.setTexture(`dt-rex-mid-${frame}`)
        .setVisible(true)
        .setPosition(
          w + 240 * s - (reveal * (w + 440 * s)) / 4.5,
          floor - 25 * s,
        )
        .setDisplaySize(430 * s, 218 * s)
        .setAlpha(pressure < 0 ? 1 : Math.max(0, 1 - pressure / 0.3));
    if (pressure >= 0 && pressure < 8.4) {
      // The giant skull occupies the left margin; collision silhouettes ahead stay clear.
      const size = (590 + 80 * Math.min(1, Math.max(0, chase / 0.4))) * s;
      this.rex[2]!.setTexture(`dt-rex-near-${frame}`)
        .setVisible(true)
        .setPosition(
          -size * 0.31 + w * 0.08,
          floor + 145 * s + Math.sin(poseTime * 7) * 3 * s,
        )
        .setDisplaySize(size, (size * 310) / 610)
        .setAlpha(
          section === "flash"
            ? Math.max(0, 1 - (t - 38.4) / 1.2)
            : Math.min(1, pressure / 0.3),
        );
    }
  }
  footstep(c: Composition, t: number) {
    const mid = this.age("herd-mid", t),
      x = c.width + 110 * c.scale - mid * 47 * c.scale;
    if (mid >= 0 && mid < 17 && x > -60 && x < c.width + 60)
      return { x, y: c.floor - 35 * c.scale };
    const far = this.age("herd-far", t);
    if (far >= 0 && far < 29)
      return {
        x: c.width * 0.28 + 90 * c.scale - far * 9 * c.scale,
        y: c.floor - 160 * c.scale,
      };
  }
  reset() {
    this.encounters.length = 0;
  }
}
