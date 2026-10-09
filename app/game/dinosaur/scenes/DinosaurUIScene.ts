import Phaser from "phaser";
import type { ControlRect, UIAction } from "../types";
import type { DinosaurRunScene } from "./DinosaurRunScene";
import { gameCopy } from "../copy";
import { COLORS } from "../config/visual";
export class DinosaurUIScene extends Phaser.Scene {
  private run!: DinosaurRunScene;
  private panel!: Phaser.GameObjects.Container;
  private percent!: Phaser.GameObjects.Text;
  private progress!: Phaser.GameObjects.Rectangle;
  private death!: Phaser.GameObjects.Text;
  private deathLabel!: Phaser.GameObjects.Text;
  private buttons = new Map<UIAction, Phaser.GameObjects.Rectangle>();
  private controls: ControlRect[] = [];
  private lastProgress = -1;
  private backdrop!: Phaser.GameObjects.Rectangle;
  private panelX = 0;
  constructor() {
    super("deep-time-ui");
  }
  init(data: { run: DinosaurRunScene }) {
    this.run = data.run;
  }
  create() {
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
    if (label) this.text(x + 18, y + 16, this.run.locale === "en" ? label.toUpperCase() : label, 14);
    this.controls.push({ action, x, y, width: w, height: h, label });
  }
  refresh() {
    if (!this.panel) return;
    const w = this.scale.width,
      h = this.scale.height,
      m = w < 700 ? 24 : 48,
      bw = Math.min(360, w - m * 2),
      left = (w - bw) / 2;
    const compact = w >= 700 && h < 600;
    if (this.run.mode === "starting") {
      this.run.hooks.controls([]);
      return;
    }
    this.panel.setAlpha(1).setPosition(0, 0).setScale(1);
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
    this.percent.setPosition(w - m - 58, 26 + safe);
    this.progress
      .setPosition(0, 0)
      .setSize(w * this.run.runtime.world.clock.progress, 2);
    this.death.setPosition(w / 2, h * 0.36);
    this.deathLabel.setPosition(w / 2, h * 0.45);
    this.backdrop.setSize(w, h);
    const mode = this.run.mode, copy = gameCopy(this.run.locale);
    this.backdrop.setVisible(
      mode === "ready" ||
        mode === "paused" ||
        mode === "complete",
    );
    this.percent.setVisible(mode === "running" || mode === "dead");
    this.progress.setVisible(mode === "running" || mode === "dead");
    if (mode === "ready") {
      this.text(left, 0, copy.metadata, 10, "#b7a68a");
      this.button("start", `${copy.start}  →`, left, 48, bw);
      this.text(
        left,
        117,
        copy.jumpHint,
        11,
        "#b7a68a",
      );
      this.button(
        "leave",
        `${copy.home}  ↗`,
        left,
        158,
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
      const x = compact ? m : left;
      this.text(x, 0, copy.pauseCaption, 11, "#b7a68a");
      const heading = this.text(x, 36, copy.pausedTitle, compact || w < 700 ? 52 : 80, "#e9e4d8", true);
      const details = this.text(
        x,
        heading.y + heading.height + 24,
        copy.attemptBest(this.run.attempts, Math.floor(this.run.record.bestProgress * 100)),
        11,
        "#b7a68a",
      );
      const y = details.y + details.height + 32;
      const width = compact ? (w - m * 2 - 32) / 3 : bw;
      this.button("resume", `${copy.resume}  →`, x, y, width);
      this.button(
        "mute",
        this.run.audio.muted ? copy.soundOff : copy.soundOn,
        compact ? x + width + 16 : x,
        compact ? y : y + 68,
        width,
      );
      this.button(
        "leave",
        `${copy.home}  ↗`,
        compact ? x + (width + 16) * 2 : x,
        compact ? y : y + 136,
        width,
      );
    } else if (mode === "complete" && this.run.result) {
      const r = this.run.result;
      const x = compact ? m : left;
      const heading = this.text(
        x,
        0,
        compact ? copy.completeTitle : copy.completeTitle.replace(" ", "\n"),
        compact ? 38 : w < 700 ? 46 : 66,
        "#e9e4d8",
        true,
      );
      const details = this.text(
        x,
        heading.height + 24,
        copy.clearDetails(Math.round(r.sync * 100), this.run.attempts),
        12,
        "#b7a68a",
      );
      const score = this.text(
        compact ? w * 0.57 : x,
        compact ? heading.height + 20 : details.y + details.height + 24,
        r.score.toLocaleString(this.run.locale === "ja" ? "ja-JP" : "en-US"),
        compact || w < 700 ? 58 : 82,
        "#e9e4d8",
        true,
      );
      const rank = this.text(x, Math.max(score.y + score.height, details.y + details.height) + 18, copy.scoreRank(r.rank), 14);
      const y = rank.y + rank.height + 32;
      const width = compact ? (w - m * 2 - 16) / 2 : bw;
      this.button("retry", `${copy.retry}  →`, x, y, width);
      this.button(
        "leave",
        `${copy.home}  ↗`,
        compact ? x + width + 16 : x,
        compact ? y : y + 68,
        width,
        compact ? 52 : 44,
      );
    }
    if (mode !== "running" && mode !== "dead") {
      const bottom = parseFloat(getComputedStyle(this.game.canvas.parentElement!).paddingBottom) || 0;
      const bounds = this.panel.getBounds();
      const available = Math.max(1, h - safe - bottom - 40);
      const scale = Math.min(1, available / Math.max(1, bounds.height));
      this.panel.setScale(scale).setPosition(w * (1 - scale) / 2,
        safe + 20 + (available - bounds.height * scale) / 2 - bounds.y * scale);
      this.controls = this.controls.map(control => ({ ...control,
        x: this.panel.x + control.x * scale, y: this.panel.y + control.y * scale,
        width: control.width * scale, height: control.height * scale,
      }));
    }
    this.panelX = this.panel.x;
    this.run.hooks.controls(this.controls);
  }
  override update() {
    if (this.run.mode === "starting") {
      const p = Math.min(1, this.run.startingAge / 0.3);
      this.panel.setAlpha(1 - p).setX(this.panelX - 16 * p);
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
          ? gameCopy(this.run.locale).newBest
          : gameCopy(this.run.locale).attempt(this.run.attempts),
      );
      const alpha = Math.min(1, (this.run.deadAge - 0.18) / 0.09);
      this.death.setAlpha(alpha);
      this.deathLabel.setAlpha(alpha);
    }
  }
}
