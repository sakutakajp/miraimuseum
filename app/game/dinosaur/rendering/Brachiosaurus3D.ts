import Phaser from "phaser";
import { ACESFilmicToneMapping, AmbientLight, DirectionalLight, OrthographicCamera, Scene, SRGBColorSpace, WebGLRenderer } from "three";
import type { PlayerModel } from "../player-model";
import type { Composition } from "../systems/CameraDirector";
import type { WorldState } from "../systems/FixedStepWorld";

/** Draw the actual GLB between terrain and foreground, using Phaser's canvas and context. */
export class Brachiosaurus3D extends Phaser.GameObjects.Extern {
  readonly world = new Scene();
  readonly camera = new OrthographicCamera(-1, 1, 1, -1, 0.1, 2000);
  readonly renderer: WebGLRenderer;
  private viewportWidth = 0;
  private viewportHeight = 0;

  constructor(scene: Phaser.Scene, readonly model: PlayerModel, context: WebGL2RenderingContext) {
    super(scene);
    this.type = "Brachiosaurus3D";
    // Phaser's image upload flags are invalid for Three's 3D textures.
    context.pixelStorei(context.UNPACK_FLIP_Y_WEBGL, false);
    context.pixelStorei(context.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    this.renderer = new WebGLRenderer({ canvas: scene.game.canvas, context });
    this.renderer.autoClear = false;
    this.renderer.outputColorSpace = SRGBColorSpace;
    this.renderer.toneMapping = ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    this.camera.position.z = 1000;
    const key = new DirectionalLight("#fff6e9", 3);
    key.position.set(-100, 200, 300);
    this.world.add(new AmbientLight("#ffffff", 2.4), key, model.object3D);
    this.renderer.resetState();
    (scene.game.renderer as Phaser.Renderer.WebGL.WebGLRenderer).pipelines.rebind();
    scene.add.existing(this);
    this.setDepth(8);
  }

  pose(c: Composition, state: WorldState) {
    if (this.viewportWidth !== c.width || this.viewportHeight !== c.height) {
      this.viewportWidth = c.width; this.viewportHeight = c.height;
      this.camera.left = -c.width / 2; this.camera.right = c.width / 2;
      this.camera.top = c.height / 2; this.camera.bottom = -c.height / 2;
      this.camera.updateProjectionMatrix();
    }
    this.model.object3D.scale.setScalar(c.scale);
    this.model.object3D.position.set(c.playerX - c.width / 2,
      c.height / 2 - c.floor - state.playerY * c.scale, 0);
  }

  render() {
    if (!this.viewportWidth || !this.viewportHeight) return;
    const context = this.renderer.getContext();
    context.pixelStorei(context.UNPACK_FLIP_Y_WEBGL, false);
    context.pixelStorei(context.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    this.renderer.resetState();
    this.renderer.setViewport(0, 0, this.viewportWidth, this.viewportHeight);
    this.renderer.clearDepth();
    this.renderer.render(this.world, this.camera);
    this.renderer.resetState();
  }

  release() { this.renderer.dispose(); }
}
