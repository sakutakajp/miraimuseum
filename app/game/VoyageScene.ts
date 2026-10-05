import Phaser from "phaser";
import { palette, sprites, spriteSize } from "../data/sprites";
import { getDiscovery, type DiscoveryId } from "../data/discoveries";
import { getWorld } from "../data/worlds";
import { museumAudio } from "./audio";
import {
  Voyage,
  VOYAGE_LENGTH,
  voyageObstacles,
  voyagePhaseAt,
  type VoyageWorld,
  type VoyagePhase,
} from "./voyage";
import type { SceneHooks } from "./scene-types";

const WIDTH = 420,
  PLAYER_X = 106;
export class VoyageScene extends Phaser.Scene {
  readonly voyage: Voyage;
  private art!: Phaser.GameObjects.Graphics;
  private effects!: Phaser.GameObjects.Graphics;
  private player!: Phaser.GameObjects.Image;
  private landmark!: Phaser.GameObjects.Image;
  private tutor!: Phaser.GameObjects.Text;
  private endingSprite!: Phaser.GameObjects.Image;
  private endingText!: Phaser.GameObjects.Text;
  private items = new Map<DiscoveryId, Phaser.GameObjects.Image>();
  private rocks: Phaser.GameObjects.Image[] = [];
  private elapsed = 0;
  private endTime = 0;
  private lastState = 0;
  private phase: VoyagePhase = "start";
  private stopped = false;
  private hasActed = false;
  private notified = false;
  private thrustTime = 0;
  constructor(
    readonly world: VoyageWorld,
    private hooks: SceneHooks,
  ) {
    super(world);
    this.voyage = new Voyage(world);
  }
  private get height() {
    return this.scale.height;
  }
  private get floor() {
    return this.height - 132;
  }
  create() {
    for (const [key, rows] of Object.entries(sprites)) {
      const size = spriteSize(key),
        graphic = this.make.graphics({ x: 0, y: 0 });
      rows.forEach((row, y) =>
        [...row].forEach((color, x) => {
          if (color !== ".")
            graphic
              .fillStyle(
                Phaser.Display.Color.HexStringToColor(palette[color]!).color,
              )
              .fillRect(x, y, 1, 1);
        }),
      );
      graphic.generateTexture(key, size.width, size.height);
      graphic.destroy();
      this.textures.get(key).setFilter(Phaser.Textures.FilterMode.NEAREST);
    }
    this.art = this.add.graphics();
    this.landmark = this.add.image(
      280,
      250,
      this.world === "space" ? "moon" : "turtle",
    );
    for (const item of this.voyage.collectibles)
      this.items.set(item.id, this.add.image(0, 0, item.id).setScale(2.5));
    this.rocks = voyageObstacles.map((item) =>
      this.add
        .image(
          0,
          0,
          this.world === "ocean" && item.y < 0 ? "jellyfish" : "rock",
        )
        .setOrigin(0.5, 1),
    );
    this.player = this.add
      .image(
        PLAYER_X,
        this.floor,
        this.world === "space" ? "astronaut" : "diver",
      )
      .setScale(3)
      .setOrigin(0.5, 1);
    this.tutor = this.add
      .text(160, 0, "☝", { fontSize: "50px", color: "#fff8dc" })
      .setOrigin(0.5);
    this.effects = this.add.graphics();
    this.endingSprite = this.add.image(WIDTH / 2, 0, "robot").setVisible(false);
    this.endingText = this.add
      .text(WIDTH / 2, 0, "", {
        fontFamily: "sans-serif",
        fontSize: "23px",
        fontStyle: "bold",
        color: "#fff7da",
        align: "center",
        lineSpacing: 14,
      })
      .setOrigin(0.5)
      .setVisible(false);
    this.input.on("pointerdown", () => this.act());
    for (const key of ["SPACE", "ARROWUP"])
      this.input.keyboard?.on("keydown-" + key, (event: KeyboardEvent) => {
        event.preventDefault();
        if (!event.repeat) this.act();
      });
    this.input.keyboard?.on("keydown-ESC", () => this.setPaused(!this.stopped));
    this.scale.on(Phaser.Scale.Events.RESIZE, this.resizeWorld, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () =>
      this.scale.off(Phaser.Scale.Events.RESIZE, this.resizeWorld, this),
    );
    this.resizeWorld();
    museumAudio.start(this.world);
    this.publish();
    this.hooks.cue(
      this.world === "space"
        ? "タップで噴射。星の海へ出発！"
        : "タップでひと泳ぎ。青い世界へ！",
    );
  }
  private publish() {
    this.hooks.state({
      phase: this.phase,
      distance: Math.min(1, this.voyage.x / VOYAGE_LENGTH),
      found: [...this.voyage.found],
      paused: this.stopped,
    });
  }
  setPaused(paused: boolean) {
    this.stopped = paused;
    if (paused) museumAudio.pause();
    else museumAudio.resume();
    this.publish();
  }
  private act() {
    if (this.stopped || !this.voyage.boost()) return;
    this.hasActed = true;
    this.thrustTime = 0.25;
    museumAudio.jump();
  }
  private resizeWorld() {
    this.endingSprite.setY(this.height / 2 - 45);
    this.endingText.setY(this.height / 2 + 85);
    this.renderWorld();
    if (this.phase === "ending") this.renderEnding(0);
  }
  override update(_time: number, delta: number) {
    if (this.stopped) return;
    const dt = Math.min(delta / 1000, 0.05);
    this.elapsed += dt;
    this.thrustTime = Math.max(0, this.thrustTime - dt);
    const result = this.voyage.update(dt);
    if (result.bump) {
      museumAudio.bump();
      this.cameras.main.shake(120, 0.004);
      this.hooks.cue("だいじょうぶ。少し戻って、もう一度！");
    }
    if (result.assisted) this.hooks.cue("ロボットが安全な道へおてつだい！");
    result.found.forEach((id) => {
      museumAudio.discover();
      this.hooks.discover(id);
    });
    const next = voyagePhaseAt(this.voyage.x);
    if (next !== this.phase) {
      this.phase = next;
      const cues =
        this.world === "space"
          ? {
              middle: "土星のわっかは、何でできている？",
              deep: "星雲だ。新しい星が生まれる場所もあるよ。",
              encounter: "ブラックホールを、遠くから観察しよう。",
              ending: "星の記録を、持ち帰ろう。",
            }
          : {
              middle: "海を旅する仲間に、会いに行こう。",
              deep: "光の届かない深海へ。小さなあかりを探そう。",
              encounter: "マッコウクジラだ！深い海の大きな旅人。",
              ending: "海の記録を、持ち帰ろう。",
            };
      if (next !== "start") this.hooks.cue(cues[next]);
    }
    this.renderWorld();
    if (this.phase === "ending") this.renderEnding(dt);
    if (this.elapsed - this.lastState > 0.15) {
      this.lastState = this.elapsed;
      this.publish();
    }
  }
  private renderWorld() {
    const g = this.art.clear(),
      f = this.effects.clear();
    const x = this.voyage.x,
      floor = this.floor,
      height = this.height;
    const deep =
      this.phase === "deep" ||
      this.phase === "encounter" ||
      this.phase === "ending";
    if (this.world === "space") {
      g.fillStyle(deep ? 0x211a36 : 0x1b2c49).fillRect(0, 0, WIDTH, height);
      for (let i = 0; i < 75; i++) {
        const sx =
          (((i * 71 - x * (i % 2 ? 0.1 : 0.2)) % WIDTH) + WIDTH) % WIDTH;
        const sy = ((i * 97) % (height - 80)) + 60;
        g.fillStyle(
          i % 9 ? 0xd4dfe0 : 0xf2c572,
          0.45 + Math.sin(this.elapsed + i) * 0.2,
        ).fillRect(sx, sy, i % 9 ? 2 : 4, 2);
      }
      const texture =
        this.phase === "start"
          ? "earth"
          : this.phase === "middle"
            ? "saturn"
            : this.phase === "deep"
              ? "nebula"
              : "blackhole";
      this.landmark
        .setTexture(texture)
        .setScale(deep ? 9 : 6)
        .setPosition(290, height * 0.35)
        .setAlpha(0.9)
        .setVisible(true);
      if (this.phase === "encounter") {
        for (let i = 0; i < 30; i++) {
          const angle = this.elapsed * 0.15 + i * 0.6,
            radius = 100 + (i % 5) * 9;
          g.fillStyle(0xe3b779, 0.5).fillRect(
            290 + Math.cos(angle) * radius,
            height * 0.35 + Math.sin(angle) * radius * 0.4,
            4,
            3,
          );
        }
      }
      g.fillStyle(0x676a83).fillRect(0, floor + 18, WIDTH, height - floor);
      g.fillStyle(0x9293a3).fillRect(0, floor, WIDTH, 18);
      for (let i = 0; i < 12; i++) {
        const sx = ((((i * 47 - x * 0.5) % 564) + 564) % 564) - 80;
        g.fillStyle(0x505670).fillRect(sx, floor + 38 + (i % 3) * 15, 28, 7);
        g.fillStyle(0xaeb0ba).fillRect(
          sx + 5,
          floor + 36 + (i % 3) * 15,
          17,
          3,
        );
      }
    } else {
      const colors = deep
        ? [0x183d55, 0x14344b, 0x102b43, 0x10273c]
        : [0x69bbca, 0x459db4, 0x2a7f99, 0x21647f];
      colors.forEach((color, i) =>
        g.fillStyle(color).fillRect(0, (i * height) / 4, WIDTH, height / 4 + 1),
      );
      if (!deep) {
        for (let i = 0; i < 5; i++)
          g.fillStyle(0xd1f3e5, 0.06).fillTriangle(
            i * 100,
            0,
            i * 100 - 45,
            floor,
            i * 100 + 100,
            floor,
          );
      }
      for (let i = 0; i < 35; i++) {
        const bx = (((i * 83 - x * 0.2) % WIDTH) + WIDTH) % WIDTH,
          by = (((i * 67 - this.elapsed * 17) % height) + height) % height;
        g.lineStyle(1, 0xb0ecdf, deep ? 0.18 : 0.35).strokeCircle(
          bx,
          by,
          (i % 3) + 2,
        );
      }
      g.fillStyle(deep ? 0x405769 : 0x93aa8c).fillRect(
        0,
        floor,
        WIDTH,
        height - floor,
      );
      for (let i = 0; i < 10; i++) {
        const sx = ((((i * 57 - x * 0.4) % 570) + 570) % 570) - 65;
        g.fillStyle(deep ? 0x617887 : 0xc98b7f)
          .fillRect(sx, floor - 16, 6, 26)
          .fillRect(sx - 9, floor - 7, 18, 5);
        g.fillStyle(deep ? 0x87a6aa : 0xa8c19d).fillRect(
          sx + 26,
          floor - 8,
          4,
          15,
        );
      }
      const texture =
        this.phase === "encounter" || this.phase === "ending"
          ? "whale"
          : deep
            ? "anglerfish"
            : "turtle";
      this.landmark
        .setTexture(texture)
        .setScale(this.phase === "encounter" ? 10 : 6)
        .setPosition(
          290 + Math.sin(this.elapsed * 0.5) * 28,
          height * 0.4 + Math.sin(this.elapsed) * 12,
        )
        .setAlpha(deep ? 0.75 : 0.5)
        .setVisible(true);
      if (deep)
        g.fillStyle(0xffe3a3, 0.1).fillCircle(285, height * 0.4 - 25, 38);
    }
    for (const [i, obstacle] of voyageObstacles.entries()) {
      this.rocks[i]!.setPosition(PLAYER_X + obstacle.x - x, floor + obstacle.y)
        .setDisplaySize(obstacle.width, obstacle.height)
        .setVisible(Math.abs(obstacle.x - x) < WIDTH);
    }
    for (const item of this.voyage.collectibles) {
      const sx = PLAYER_X + item.x - x,
        sy = floor - (item.elevated ? 110 : 49);
      const visible =
        !this.voyage.found.has(item.id) && sx > -60 && sx < WIDTH + 60;
      this.items
        .get(item.id)!
        .setPosition(sx, sy + Math.sin(this.elapsed * 2) * 3)
        .setVisible(visible);
      if (visible)
        f.lineStyle(2, 0xffdf8d, 0.8).strokeCircle(
          sx,
          sy,
          33 + Math.sin(this.elapsed * 3) * 2,
        );
    }
    const py = floor + this.voyage.y;
    this.player
      .setY(py)
      .setAngle(this.voyage.y < -1 ? -12 : 0)
      .setAlpha(
        this.voyage.invulnerable
          ? Math.sin(this.elapsed * 30) > 0
            ? 0.5
            : 1
          : 1,
      );
    if (this.thrustTime > 0) {
      if (this.world === "space")
        f.fillStyle(0xf1c15e)
          .fillRect(PLAYER_X - 16, py - 1, 8, 15)
          .fillRect(PLAYER_X + 7, py - 1, 8, 15);
      else
        for (let i = 0; i < 4; i++)
          f.lineStyle(2, 0xc1efe6, 0.8).strokeCircle(
            PLAYER_X - 28 - i * 9,
            py - 12 + i * 3,
            3,
          );
    }
    this.tutor
      .setY(floor - 110 + Math.sin(this.elapsed * 5) * 10)
      .setVisible(!this.hasActed && x > 500 && x < 1100);
  }
  private renderEnding(dt: number) {
    this.endTime += dt;
    this.player.setVisible(false);
    this.landmark.setVisible(false);
    this.tutor.setVisible(false);
    const slides =
      this.world === "space"
        ? [
            { sprite: "earth", text: "青い地球から、\n星の海へ。" },
            { sprite: "saturn", text: "いろいろな星。\nいろいろな、ふしぎ。" },
            { sprite: "nebula", text: "光を集めて、\n宇宙を調べる。" },
            {
              sprite: "blackhole",
              text: "遠くの世界にも、\nまだ知らないことがある。",
            },
            { sprite: "robot", text: "星の記録を、\n博物館へ。" },
          ]
        : [
            { sprite: "coral", text: "明るい海から、\n深い海へ。" },
            { sprite: "anglerfish", text: "暗い海にも、\nいのちのあかり。" },
            {
              sprite: "vent",
              text: "太陽の光がなくても、\n暮らせる場所がある。",
            },
            { sprite: "whale", text: "大きな旅人に、\nまた会いに行こう。" },
            { sprite: "robot", text: "海の記録を、\n博物館へ。" },
          ];
    const slide =
      slides[Math.min(slides.length - 1, Math.floor(this.endTime / 1.5))]!;
    this.effects.fillStyle(0x172c3a, 0.96).fillRect(0, 0, WIDTH, this.height);
    this.endingSprite
      .setTexture(slide.sprite)
      .setScale(slide.sprite === "whale" ? 6 : 7)
      .setVisible(true);
    this.endingText.setText(slide.text).setVisible(true);
    if (this.endTime >= 8.5 && !this.notified) {
      this.notified = true;
      museumAudio.finish();
      this.hooks.finish([...this.voyage.found]);
    }
  }
}
