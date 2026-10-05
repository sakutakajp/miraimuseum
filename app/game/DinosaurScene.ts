import Phaser from "phaser";
import { sprites, palette, spriteSize } from "../data/sprites";
import {
  Expedition,
  obstacles,
  collectibles,
  STAGE_LENGTH,
  phaseAt,
  type Phase,
} from "./expedition";
import { museumAudio } from "./audio";
import type { DiscoveryId } from "../data/discoveries";
export interface GameState {
  phase: Phase;
  distance: number;
  found: DiscoveryId[];
  paused: boolean;
}
export interface SceneHooks {
  state: (state: GameState) => void;
  discover: (id: DiscoveryId) => void;
  cue: (message: string) => void;
  finish: (ids: DiscoveryId[]) => void;
}
const W = 420,
  PLAYER_X = 106;
export class DinosaurScene extends Phaser.Scene {
  readonly expedition = new Expedition();
  private art!: Phaser.GameObjects.Graphics;
  private foreground!: Phaser.GameObjects.Graphics;
  private player!: Phaser.GameObjects.Image;
  private dinosaur!: Phaser.GameObjects.Image;
  private itemImages = new Map<DiscoveryId, Phaser.GameObjects.Image>();
  private rockImages: Phaser.GameObjects.Image[] = [];
  private tutor!: Phaser.GameObjects.Text;
  private endingText!: Phaser.GameObjects.Text;
  private endingSprite!: Phaser.GameObjects.Image;
  private elapsed = 0;
  private endTime = 0;
  private phase: Phase = "present";
  private lastState = 0;
  private notified = false;
  private endingSoundPlayed = false;
  private hasJumped = false;
  private stopped = false;
  constructor(private hooks: SceneHooks) {
    super("dinosaur");
  }
  private get height() {
    return this.scale.height;
  }
  private get floor() {
    return this.height - 132;
  }
  create() {
    const FLOOR = this.floor;
    const frames = {
      ...sprites,
      playerStride: sprites.player!.map((row, y) =>
        y === 15
          ? "...onno..onno..."
          : y === 16
            ? "..oooo....oooo.."
            : y === 17
              ? "..owwo....owwo.."
              : row,
      ),
    };
    for (const [key, rows] of Object.entries(frames)) {
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
    this.dinosaur = this.add
      .image(330, FLOOR, "rex")
      .setOrigin(0.5, 1)
      .setScale(7)
      .setVisible(false);
    for (const item of collectibles)
      this.itemImages.set(
        item.id,
        this.add
          .image(
            0,
            0,
            item.id === "rex"
              ? "rex"
              : item.id === "strata"
                ? "strata"
                : item.id,
          )
          .setScale(item.id === "fossil" ? 2.8 : 2.5),
      );
    this.rockImages = obstacles.map(() =>
      this.add.image(0, FLOOR, "rock").setOrigin(0.5, 1),
    );
    this.player = this.add
      .image(PLAYER_X, FLOOR, "player")
      .setOrigin(0.5, 1)
      .setScale(3);
    this.foreground = this.add.graphics();
    this.tutor = this.add
      .text(PLAYER_X + 55, FLOOR - 130, "☝", {
        fontSize: "50px",
        color: "#fff9e6",
      })
      .setOrigin(0.5)
      .setVisible(false);
    this.endingSprite = this.add
      .image(W / 2, 330, "rex")
      .setScale(7)
      .setVisible(false);
    this.endingText = this.add
      .text(W / 2, 440, "", {
        fontFamily: "sans-serif",
        fontSize: "24px",
        fontStyle: "bold",
        color: "#fff7da",
        align: "center",
        lineSpacing: 14,
      })
      .setOrigin(0.5)
      .setVisible(false);
    this.input.on("pointerdown", () => this.jump());
    this.input.keyboard?.on("keydown-SPACE", (event: KeyboardEvent) => {
      event.preventDefault();
      if (!event.repeat) this.jump();
    });
    this.input.keyboard?.on("keydown-ARROWUP", (event: KeyboardEvent) => {
      event.preventDefault();
      if (!event.repeat) this.jump();
    });
    this.input.keyboard?.on("keydown-ESC", () => this.setPaused(!this.stopped));
    this.scale.on(Phaser.Scale.Events.RESIZE, this.resizeWorld, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off(Phaser.Scale.Events.RESIZE, this.resizeWorld, this);
    });
    this.resizeWorld();
    museumAudio.start();
    this.hooks.state({
      phase: this.phase,
      distance: 0,
      found: [],
      paused: false,
    });
  }
  private resizeWorld() {
    this.endingSprite.setY(this.height / 2 - 20);
    this.endingText.setY(this.height / 2 + 90);
    this.renderWorld();
    if (this.phase === "ending") this.renderEnding(0);
  }
  jump() {
    if (this.stopped) return;
    if (this.expedition.jump()) {
      this.hasJumped = true;
      museumAudio.jump();
    }
  }
  setPaused(paused: boolean) {
    this.stopped = paused;
    if (paused) museumAudio.pause();
    else museumAudio.resume();
    this.hooks.state({
      phase: this.phase,
      distance: this.expedition.x / STAGE_LENGTH,
      found: [...this.expedition.found],
      paused,
    });
  }
  override update(_time: number, delta: number) {
    if (this.stopped) return;
    const dt = Math.min(delta / 1000, 0.05);
    this.elapsed += dt;
    const result = this.expedition.update(dt);
    if (result.bump) {
      museumAudio.bump();
      this.cameras.main.shake(150, 0.005);
      this.hooks.cue("だいじょうぶ。もう一度、ぴょん！");
    }
    if (result.assisted) {
      museumAudio.jump();
      this.hooks.cue("ロボットがジャンプをおてつだい！");
    }
    for (const id of result.found) {
      museumAudio.discover();
      this.hooks.discover(id);
    }
    const next = phaseAt(this.expedition.x);
    if (next !== this.phase) {
      this.phase = next;
      if (next === "rewind") {
        this.cameras.main.flash(700, 248, 225, 147);
        this.hooks.cue("化石の向こうへ。時間が巻きもどる…");
      }
      if (next === "past") this.hooks.cue("約6700万年前。恐竜の世界へ！");
      if (next === "chase") {
        this.cameras.main.shake(550, 0.007);
        this.hooks.cue("ティラノサウルスだ！走りぬけよう！");
      }
    }
    this.renderWorld();
    if (this.phase === "ending") this.renderEnding(dt);
    if (this.elapsed - this.lastState > 0.15) {
      this.lastState = this.elapsed;
      this.hooks.state({
        phase: this.phase,
        distance: Math.min(1, this.expedition.x / STAGE_LENGTH),
        found: [...this.expedition.found],
        paused: false,
      });
    }
  }
  private renderWorld() {
    const H = this.height,
      FLOOR = this.floor,
      x = this.expedition.x,
      past = this.phase === "past" || this.phase === "chase";
    const g = this.art.clear();
    g.fillStyle(past ? 0xcbdac4 : 0xeadfb8).fillRect(0, 0, W, H);
    // Anchor the landscape to the ground, extending the sky on tall phones.
    g.save().translateCanvas(0, FLOOR - 568);
    g.fillStyle(past ? 0xe8edce : 0xf1e8cc).fillRect(0, 310, W, 265);
    g.fillStyle(0xf6cf71).fillCircle(319, 126, 36);
    for (let i = 0; i < 4; i++) {
      const cx = ((((i * 173 - x * 0.07) % 680) + 680) % 680) - 130;
      g.fillStyle(0xfff7df, 0.7)
        .fillRect(cx, 83 + (i % 2) * 65, 85, 14)
        .fillRect(cx + 17, 72 + (i % 2) * 65, 45, 14);
    }
    for (let i = 0; i < 5; i++) {
      const mx = ((((i * 195 - x * 0.16) % 975) + 975) % 975) - 230;
      g.fillStyle(past ? 0xa3b995 : 0xc4b68d).fillTriangle(
        mx,
        427,
        mx + 105,
        217 + (i % 2) * 39,
        mx + 240,
        427,
      );
      g.fillStyle(past ? 0x8fa78a : 0xb0a382).fillTriangle(
        mx + 105,
        217 + (i % 2) * 39,
        mx + 240,
        427,
        mx + 135,
        427,
      );
    }
    for (let i = 0; i < 8; i++) {
      const tx = ((((i * 103 - x * 0.38) % 824) + 824) % 824) - 103;
      if (past) {
        g.fillStyle(0x607e6b).fillRect(tx + 39, 349, 13, 210);
        g.fillStyle(0x7e9b79)
          .fillRect(tx, 313 + (i % 3) * 26, 86, 35)
          .fillRect(tx + 12, 287 + (i % 3) * 26, 63, 33)
          .fillRect(tx + 27, 269 + (i % 3) * 26, 37, 24);
      } else {
        g.fillStyle(0x998d6b)
          .fillRect(tx, 487, 70, 77)
          .fillRect(tx + 14, 458, 40, 45);
        g.fillStyle(0xa99c77).fillRect(tx + 7, 490, 22, 61);
      }
    }
    g.restore();
    g.fillStyle(past ? 0x3e604e : 0x8e9162).fillRect(0, FLOOR, W, 13);
    g.fillStyle(past ? 0x93a572 : 0xc0ad71).fillRect(0, FLOOR + 13, W, 9);
    g.fillStyle(0xa6855e).fillRect(0, FLOOR + 22, W, 39);
    g.fillStyle(0x80644d).fillRect(0, FLOOR + 61, W, 37);
    g.fillStyle(0x634f40).fillRect(0, FLOOR + 98, W, 38);
    for (let i = 0; i < 11; i++) {
      const sx = ((((i * 53 - x) % 583) + 583) % 583) - 53;
      g.fillStyle(0xc3a47a).fillRect(sx, FLOOR + 39 + (i % 3) * 4, 11, 4);
      g.fillStyle(0xab8c66).fillRect(sx + 21, FLOOR + 82, 7, 5);
      if (past)
        g.fillStyle(0xb7c68a)
          .fillRect(sx, FLOOR - 6, 4, 8)
          .fillRect(sx + 4, FLOOR - 10, 4, 12);
    }
    for (let i = 0; i < obstacles.length; i++) {
      const obstacle = obstacles[i]!,
        sprite = this.rockImages[i]!;
      sprite
        .setPosition(PLAYER_X + obstacle.x - x, FLOOR)
        .setDisplaySize(obstacle.width + 6, obstacle.height)
        .setVisible(Math.abs(obstacle.x - x) < W);
    }
    this.dinosaur.setVisible(past);
    if (this.phase === "chase") {
      this.dinosaur
        .setPosition(
          5 + Math.sin(this.elapsed * 2) * 8,
          FLOOR - 9 + Math.sin(this.elapsed * 8) * 3,
        )
        .setScale(7.5)
        .setAlpha(1)
        .setFlipX(false);
    } else {
      this.dinosaur
        .setPosition(390 + Math.sin(this.elapsed * 0.7) * 12, FLOOR - 22)
        .setScale(5.7)
        .setAlpha(0.45)
        .setFlipX(true);
    }
    const f = this.foreground.clear();
    for (const item of collectibles) {
      const sprite = this.itemImages.get(item.id)!,
        sx = PLAYER_X + item.x - x,
        sy = FLOOR - (item.elevated ? 115 : 49);
      const visible =
        !this.expedition.found.has(item.id) && sx > -60 && sx < W + 60;
      sprite
        .setPosition(sx, sy + Math.sin(this.elapsed * 3) * 4)
        .setVisible(visible);
      if (visible) {
        f.lineStyle(2, 0xffe9a3, 0.8).strokeCircle(
          sx,
          sy,
          33 + Math.sin(this.elapsed * 3) * 2,
        );
        f.fillStyle(0xffedab)
          .fillRect(sx - 2, sy - 45, 4, 8)
          .fillRect(sx - 4, sy - 43, 8, 4);
      }
    }
    this.player.setY(
      FLOOR +
        this.expedition.y +
        (this.expedition.y === 0 ? Math.sin(this.elapsed * 22) * 1.5 : 0),
    );
    this.player.setTexture(
      this.expedition.y === 0 && Math.floor(this.elapsed * 10) % 2
        ? "playerStride"
        : "player",
    );
    this.player
      .setAngle(this.expedition.y < 0 ? -7 : 0)
      .setAlpha(
        this.expedition.invulnerable
          ? Math.sin(this.elapsed * 34) > 0
            ? 0.4
            : 1
          : 1,
      );
    // A pulsing finger demonstrates tapping without a text tutorial.
    this.tutor
      .setVisible(!this.hasJumped && x > 440 && x < 940)
      .setY(FLOOR - 129 + Math.sin(this.elapsed * 6) * 12);
    if (this.phase === "rewind") {
      f.fillStyle(0xf5dfa6, 0.5).fillRect(0, 0, W, H);
      for (let i = 0; i < 10; i++)
        f.fillStyle(0xffffff, 0.4).fillRect(
          0,
          (this.elapsed * 180 + i * 90) % H,
          W,
          3,
        );
    }
  }
  private renderEnding(dt: number) {
    const H = this.height;
    this.endTime += dt;
    this.tutor.setVisible(false);
    this.dinosaur.setVisible(false);
    this.player.setVisible(false);
    const slides = [
      { sprite: "rex", text: "生きていた、恐竜。\n約6700万年前" },
      { sprite: "strata", text: "長い時間が流れ、\n地層の中へ。" },
      { sprite: "fossil", text: "残った化石が、\n昔の世界を教えてくれる。" },
      { sprite: "robot", text: "見つけて、調べて…" },
      { sprite: "fossil", text: "博物館へ。\n発見を、未来につなごう。" },
    ];
    const index = Math.min(4, Math.floor(this.endTime / 1.6)),
      slide = slides[index]!;
    this.foreground.fillStyle(0x263d34, 0.95).fillRect(0, 0, W, H);
    this.endingSprite
      .setVisible(true)
      .setTexture(slide.sprite)
      .setScale(slide.sprite === "rex" ? 6 : 7)
      .setAlpha(Math.min(1, (this.endTime % 1.6) * 4));
    this.endingText.setVisible(true).setText(slide.text);
    if (this.endTime >= 8 && !this.endingSoundPlayed) {
      this.endingSoundPlayed = true;
      museumAudio.finish();
    }
    if (this.endTime >= 8.9 && !this.notified) {
      this.notified = true;
      this.hooks.finish([...this.expedition.found]);
    }
  }
}
