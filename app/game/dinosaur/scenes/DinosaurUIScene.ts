import Phaser from "phaser";
import type { ControlRect, UIAction } from "../types";
import type { DinosaurRunScene } from "./DinosaurRunScene";
import { EXHIBIT_PLATES } from "../exhibit";
import { COLORS } from "../config/visual";
export class DinosaurUIScene extends Phaser.Scene {
  private run!: DinosaurRunScene;
  private panel!: Phaser.GameObjects.Container;
  private title!: Phaser.GameObjects.Text;
  private percent!: Phaser.GameObjects.Text;
  private progress!: Phaser.GameObjects.Rectangle;
  private death!: Phaser.GameObjects.Text;
  private deathLabel!: Phaser.GameObjects.Text;
  private buttons = new Map<UIAction, Phaser.GameObjects.Rectangle>();
  private controls: ControlRect[] = [];
  private exhibition = false;
  private lastProgress = -1;
  private backdrop!: Phaser.GameObjects.Rectangle;
  constructor() {
    super("deep-time-ui");
  }
  init(data: { run: DinosaurRunScene }) {
    this.run = data.run;
  }
  create() {
    this.title = this.add.text(0, 0, "DEEP TIME / 01", {
      fontFamily: "monospace",
      fontSize: "12px",
      color: "#e9e4d8",
      letterSpacing: 2,
    });
    this.percent = this.add
      .text(0, 0, "0%", {
        fontFamily: "monospace",
        fontSize: "16px",
        color: "#e9e4d8",
      })
      .setOrigin(1, 0);
    this.progress = this.add.rectangle(0, 0, 1, 2, COLORS.bone).setOrigin(0);
    this.death = this.add
      .text(0, 0, "", {
        fontFamily: "Georgia, serif",
        fontSize: "78px",
        color: "#e9e4d8",
      })
      .setOrigin(0.5)
      .setVisible(false);
    this.deathLabel = this.add
      .text(0, 0, "", {
        fontFamily: "monospace",
        fontSize: "11px",
        color: "#e9e4d8",
        letterSpacing: 3,
      })
      .setOrigin(0.5)
      .setVisible(false);
    this.backdrop = this.add
      .rectangle(0, 0, 1, 1, COLORS.obsidian, 0.94)
      .setOrigin(0)
      .setVisible(false);
    this.panel = this.add.container(0, 0);
    this.scale.on(Phaser.Scale.Events.RESIZE, this.refresh, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () =>
      this.scale.off(Phaser.Scale.Events.RESIZE, this.refresh, this),
    );
    this.refresh();
  }
  hover(action: UIAction, value: boolean) {
    const b = this.buttons.get(action);
    if (b) b.setFillStyle(COLORS.bone, value ? 0.16 : 0.05);
  }
  private text(
    x: number,
    y: number,
    value: string,
    size: number,
    color = "#e9e4d8",
    serif = false,
  ) {
    const txt = this.add.text(x, y, value, {
      fontFamily: serif ? "Georgia, serif" : "monospace",
      fontSize: `${size}px`,
      color,
      lineSpacing: 8,
      letterSpacing: serif ? 0 : 1,
    });
    this.panel.add(txt);
    return txt;
  }
  private button(
    action: UIAction,
    label: string,
    x: number,
    y: number,
    w: number,
    h = 52,
  ) {
    const rect = this.add
      .rectangle(x, y, w, h, COLORS.bone, 0.05)
      .setOrigin(0)
      .setStrokeStyle(1, COLORS.bone, 0.5);
    this.panel.add(rect);
    this.buttons.set(action, rect);
    if (label) this.text(x + 18, y + 16, label, 14);
    this.controls.push({ action, x, y, width: w, height: h, label });
  }
  refresh() {
    if (!this.panel) return;
    const w = this.scale.width,
      h = this.scale.height,
      m = w < 700 ? 24 : 48,
      bw = Math.min(360, w - m * 2),
      left = (w - bw) / 2;
    if (this.run.mode === "starting") {
      this.run.hooks.controls([]);
      return;
    }
    this.panel.setAlpha(1).setX(0);
    this.backdrop.setAlpha(1);
    this.panel.removeAll(true);
    this.controls = [];
    this.buttons.clear();
    this.backdrop.setFillStyle(COLORS.obsidian, 0.91);
    const safe = Math.max(
      0,
      parseFloat(
        getComputedStyle(this.game.canvas.parentElement!).paddingTop,
      ) || 0,
    );
    this.title.setPosition(m, 28 + safe);
    this.percent.setPosition(w - m - 58, 26 + safe);
    this.progress
      .setPosition(0, 0)
      .setSize(w * this.run.runtime.world.clock.progress, 2);
    this.death.setPosition(w / 2, h * 0.36);
    this.deathLabel.setPosition(w / 2, h * 0.45);
    this.backdrop.setSize(w, h);
    const mode = this.run.mode,
      ja = this.run.locale === "ja";
    this.backdrop.setVisible(
      mode === "ready" ||
        mode === "paused" ||
        (mode === "complete" && !this.exhibition),
    );
    this.title.setVisible(
      mode === "running" || mode === "dead" || mode === "paused",
    );
    this.percent.setVisible(mode === "running" || mode === "dead");
    this.progress.setVisible(mode === "running" || mode === "dead");
    if (mode === "ready") {
      this.text(m, h * 0.14, "EXPERIENCE / 002", 11, "#b7a68a");
      this.text(
        m,
        h * 0.25,
        "DEEP\nTIME",
        w < 700 ? Math.min(86, w * 0.22) : 132,
        "#e9e4d8",
        true,
      );
      this.text(m, h * 0.53, "01 / CRETACEOUS\n       LAST DAY", 16);
      this.text(m, h * 0.66, "66.0 Ma · 150 BPM · 48 BARS", 10, "#b7a68a");
      this.button("start", "START  →", left, h * 0.77, bw);
      this.text(
        left,
        h * 0.77 + 69,
        ja ? "タップ / Space / ↑" : "TAP / SPACE / ↑",
        11,
        "#b7a68a",
      );
      this.button(
        "leave",
        ja ? "博物館へ戻る" : "MUSEUM  ↗",
        left,
        h * 0.89,
        bw,
        44,
      );
    } else if (mode === "running" || mode === "dead") {
      this.button("pause", "", w - m - 44, 17 + safe, 44, 44);
      for (const offset of [15, 25])
        this.panel.add(
          this.add
            .rectangle(w - m - 44 + offset, 31 + safe, 3, 16, COLORS.bone)
            .setOrigin(0),
        );
    } else if (mode === "paused") {
      this.text(left, h * 0.19, "TIME SUSPENDED", 11, "#b7a68a");
      this.text(left, h * 0.3, "PAUSED", w < 700 ? 52 : 80, "#e9e4d8", true);
      this.text(
        left,
        h * 0.43,
        `ATTEMPT ${String(this.run.attempts).padStart(2, "0")} / BEST ${Math.floor(this.run.record.bestProgress * 100)}%`,
        11,
        "#b7a68a",
      );
      this.button("resume", ja ? "続ける  →" : "RESUME  →", left, h * 0.55, bw);
      this.button(
        "mute",
        this.run.audio.muted ? "SOUND  OFF" : "SOUND  ON",
        left,
        h * 0.55 + 68,
        bw,
      );
      this.button(
        "leave",
        ja ? "博物館へ戻る" : "MUSEUM  ↗",
        left,
        h * 0.55 + 136,
        bw,
      );
    } else if (mode === "complete" && this.run.result) {
      const r = this.run.result;
      if (this.exhibition) {
        this.backdrop.setVisible(true);
        this.backdrop.setFillStyle(COLORS.bone, 1);
        this.text(m, h * 0.11, "EXHIBIT / DEEP TIME", 11, "#53654b");
        this.text(m, h * 0.18, "66.0 Ma", w < 700 ? 56 : 88, "#10110f", true);
        this.text(m, h * 0.3, "K—Pg BOUNDARY", 16, "#10110f");
        const lines = EXHIBIT_PLATES.flatMap((plate, i) => [
          ...(i === 0 ? [] : ["", plate.heading]),
          ...(ja ? plate.ja : plate.en),
        ]);
        lines.forEach((line, i) =>
          this.text(m, h * 0.39 + i * 23, line, 15, "#10110f")
            .setFontFamily("sans-serif")
            .setLetterSpacing(0),
        );
        this.button("retry", "RUN AGAIN  →", left, h * 0.83, bw);
        this.button(
          "leave",
          ja ? "博物館へ戻る" : "MUSEUM  ↗",
          left,
          h * 0.91,
          bw,
          44,
        );
        for (const b of this.buttons.values())
          b.setStrokeStyle(1, COLORS.obsidian, 0.6);
        for (const obj of this.panel.list)
          if (obj instanceof Phaser.GameObjects.Text && obj.y >= h * 0.83)
            obj.setColor("#10110f");
      } else {
        this.text(left, h * 0.1, "CRETACEOUS // LAST DAY", 11, "#b7a68a");
        this.text(
          left,
          h * 0.18,
          "RUN\nCOMPLETE",
          w < 700 ? 46 : 66,
          "#e9e4d8",
          true,
        );
        this.text(
          left,
          h * 0.39,
          `CLEAR 100%     SYNC ${Math.round(r.sync * 100)}%\nATTEMPTS ${this.run.attempts}`,
          12,
          "#b7a68a",
        );
        this.text(
          left,
          h * 0.51,
          r.score.toLocaleString(),
          w < 700 ? 58 : 82,
          "#e9e4d8",
          true,
        );
        this.text(left, h * 0.62, `RUN SCORE / RANK ${r.rank}`, 14);
        this.button("exhibit", "OPEN EXHIBIT  ↗", left, h * 0.7, bw);
        this.button("retry", "RUN AGAIN  →", left, h * 0.7 + 65, bw);
        this.button(
          "leave",
          ja ? "博物館へ戻る" : "MUSEUM  ↗",
          left,
          h * 0.7 + 130,
          bw,
          44,
        );
      }
    }
    this.run.hooks.controls(this.controls);
  }
  openExhibit() {
    if (this.run.mode !== "complete") return;
    this.exhibition = true;
    this.refresh();
  }
  override update() {
    if (this.run.mode === "starting") {
      const p = Math.min(1, this.run.startingAge / 0.3);
      this.panel.setAlpha(1 - p).setX(-16 * p);
      this.backdrop.setAlpha(1 - p);
    }

    const progress = Math.floor(this.run.runtime.world.clock.progress * 100);
    if (progress !== this.lastProgress) {
      this.lastProgress = progress;
      this.percent.setText(`${progress}%`);
      this.progress.setSize((this.scale.width * progress) / 100, 2);
    }
    const death =
      this.run.mode === "dead" &&
      this.run.deadAge >= 0.18 &&
      this.run.deadAge < 0.55;
    this.death.setVisible(death);
    this.deathLabel.setVisible(death);
    if (death) {
      this.death.setText(`${Math.floor(this.run.failedProgress * 100)}%`);
      this.deathLabel.setText(
        this.run.deathBest
          ? "NEW BEST"
          : `ATTEMPT ${String(this.run.attempts).padStart(2, "0")}`,
      );
      const alpha = Math.min(1, (this.run.deadAge - 0.18) / 0.09);
      this.death.setAlpha(alpha);
      this.deathLabel.setAlpha(alpha);
    }
    if (this.run.mode !== "complete") this.exhibition = false;
  }
}
