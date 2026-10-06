import Phaser from "phaser";
import type { WorldState } from "../systems/FixedStepWorld";
import type { Composition } from "../systems/CameraDirector";
export class PlayerRenderer {
  readonly image: Phaser.GameObjects.Image;
  private shadow: Phaser.GameObjects.Ellipse;
  private landAt = -100;
  constructor(scene: Phaser.Scene) {
    this.shadow = scene.add.ellipse(0, 0, 32, 5, 0x10110f, 0.23).setDepth(2);
    this.image = scene.add
      .image(0, 0, "dt-runner-0")
      .setOrigin(0.5, 1)
      .setDepth(8);
  }
  land(t: number) {
    this.landAt = t;
  }
  render(c: Composition, s: WorldState, t: number, deadAge: number) {
    const airborne = !s.grounded,
      frame = airborne
        ? s.playerVelocityY < -100
          ? 6
          : 7
        : Math.floor(t * 12) % 6;
    const squash = Math.max(0, 1 - (t - this.landAt) / 0.1) * 0.14;
    this.image
      .setTexture(`dt-runner-${frame}`)
      .setPosition(c.playerX, c.floor + s.playerY * c.scale)
      .setDisplaySize(34 * c.scale * (1 + squash), 54 * c.scale * (1 - squash))
      .setRotation(airborne ? (s.playerVelocityY < -100 ? -0.08 : 0.045) : 0)
      .setVisible(deadAge < 0.07);
    this.shadow
      .setPosition(c.playerX, c.floor + 2 * c.scale)
      .setScale(c.scale)
      .setAlpha(Math.max(0, 0.25 + s.playerY / 600))
      .setVisible(deadAge < 0.07);
  }
  reset() {
    this.landAt = -100;
  }
}
