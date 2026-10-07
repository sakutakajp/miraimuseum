import Phaser from "phaser";
import type { WorldState } from "../systems/FixedStepWorld";
import type { Composition } from "../systems/CameraDirector";
import { Brachiosaurus3D } from "./Brachiosaurus3D";
import { PLAYER_HEIGHT } from "../config/gameplay";
import { disposePlayerModel, type PlayerModel } from "../player-model";
export class PlayerRenderer {
  readonly visual: Brachiosaurus3D | Phaser.GameObjects.Image;
  private shadow: Phaser.GameObjects.Ellipse;
  constructor(scene: Phaser.Scene, private model: PlayerModel) {
    this.shadow = scene.add.ellipse(0, 0, 42, 5, 0x10110f, 0.23).setDepth(2);
    const renderer = scene.game.renderer;
    const context = renderer instanceof Phaser.Renderer.WebGL.WebGLRenderer ? renderer.gl : undefined;
    this.visual = typeof WebGL2RenderingContext !== "undefined" && context instanceof WebGL2RenderingContext
      ? new Brachiosaurus3D(scene, model, context)
      : scene.add.image(0, 0, "dt-brachiosaurus-0").setOrigin(0.5, 1).setDepth(8);
    scene.game.canvas.dataset.playerRenderer = this.visual instanceof Brachiosaurus3D ? "three" : "static";
    scene.game.canvas.dataset.playerModelSource = model.source;
  }
  render(c: Composition, s: WorldState, deadAge: number) {
    if (this.visual instanceof Brachiosaurus3D) this.visual.pose(c, s);
    else this.visual.setPosition(c.playerX, c.floor + s.playerY * c.scale)
      .setDisplaySize(64.8 * c.scale, PLAYER_HEIGHT * c.scale);
    this.visual.setVisible(deadAge < 0.07);
    this.shadow
      .setPosition(c.playerX, c.floor + 2 * c.scale)
      .setScale(c.scale)
      .setAlpha(Math.max(0, 0.25 + s.playerY / 600))
      .setVisible(deadAge < 0.07);
  }
  reset() { this.visual.setVisible(true); }
  dispose() {
    if (this.visual instanceof Brachiosaurus3D) this.visual.release();
    disposePlayerModel(this.model);
  }
}
