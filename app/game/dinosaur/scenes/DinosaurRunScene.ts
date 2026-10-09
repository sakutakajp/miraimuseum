import Phaser from "phaser";
import { STAGE_01 } from "../levels/stage01";
import { DURATION, FIXED_DT, RETRY_SECONDS } from "../config/gameplay";
import { LevelRuntime } from "../systems/LevelRuntime";
import { CameraDirector } from "../systems/CameraDirector";
import { VisualDirector } from "../systems/VisualDirector";
import { AudioDirector } from "../systems/AudioDirector";
import { VfxDirector } from "../systems/VfxDirector";
import { recordClear } from "../systems/records";
import { BackgroundLayers } from "../rendering/BackgroundLayers";
import { TerrainRenderer } from "../rendering/TerrainRenderer";
import { DinosaurRenderer } from "../rendering/DinosaurRenderer";
import { PlayerRenderer } from "../rendering/PlayerRenderer";
import { BoundaryRenderer } from "../rendering/BoundaryRenderer";
import { createTextures, loadPlates } from "../rendering/textures";
import { disposePlayerModel, type PlayerModel } from "../player-model";
import type { DinosaurUIScene } from "./DinosaurUIScene";
import type {
  ClearResult,
  DeepTimeRecord,
  HostHooks,
  RunMode,
  UIAction,
} from "../types";
export class DinosaurRunScene extends Phaser.Scene {
  readonly runtime = new LevelRuntime(STAGE_01);
  readonly audio = new AudioDirector();
  readonly cameraDirector: CameraDirector;
  readonly visual: VisualDirector;
  mode: RunMode = "ready";
  record: DeepTimeRecord;
  result?: ClearResult;
  attempts = 0;
  deadAge = -1;
  failedProgress = 0;
  deathBest = false;
  hitboxes = false;
  devEnabled = false;
  private ready = false;
  private startPending = false;
  startingAge = 0;
  private beforePause: RunMode = "running";
  private bg!: BackgroundLayers;
  private terrain!: TerrainRenderer;
  private dinosaurs!: DinosaurRenderer;
  private player!: PlayerRenderer;
  private boundary!: BoundaryRenderer;
  vfx!: VfxDirector;
  ui?: DinosaurUIScene;
  private stepFoot = -1;
  private lastPointer = -100;
  private lastKey = -100;
  private safe = { top: 0, bottom: 0 };
  private disposed = false;
  constructor(
    readonly hooks: HostHooks,
    record: DeepTimeRecord,
    readonly reduced: boolean,
    public locale: "ja" | "en",
    private readonly model: PlayerModel,
  ) {
    super("deep-time-run");
    this.record = { ...record };
    this.cameraDirector = new CameraDirector(reduced);
    this.visual = new VisualDirector(reduced);
  }
  preload() {
    this.events.once(Phaser.Scenes.Events.DESTROY, () => this.dispose());
    loadPlates(this);
    this.load.on("loaderror", (file: Phaser.Loader.File) =>
      this.hooks.fatal(new Error(`Art asset: ${file.key}`)),
    );
  }
  create() {
    const resize = () => {
      const style = getComputedStyle(this.game.canvas.parentElement!);
      this.safe = { top: parseFloat(style.paddingTop) || 0, bottom: parseFloat(style.paddingBottom) || 0 };
    };
    resize();
    this.scale.on(Phaser.Scale.Events.RESIZE, resize);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off(Phaser.Scale.Events.RESIZE, resize));
    createTextures(this);
    this.bg = new BackgroundLayers(this);
    this.terrain = new TerrainRenderer(this);
    this.dinosaurs = new DinosaurRenderer(this);
    this.player = new PlayerRenderer(this, this.model);
    this.vfx = new VfxDirector(this, this.reduced);
    this.boundary = new BoundaryRenderer(this);
    this.runtime.onCue = (cue) => {
      const t = this.runtime.world.clock.elapsedSeconds;
      if (cue.type === "dinosaur") this.dinosaurs.cue(cue.value, t);
      if (cue.value === "impact-flash") this.visual.flash(t);
      if (cue.type === "camera")
        this.cameraDirector.impulse(t, cue.value === "impact" ? 7 : 4);
      if (cue.type === "audio" && cue.value === "rex") this.audio.play("rex");
      if (cue.type === "audio" && cue.value === "rock") this.audio.play("rock");
      if (cue.type === "visual" && cue.value === "collapse") {
        const p = this.runtime.level.terrain.find(
          (p) =>
            p.collapseAt !== undefined && Math.abs(p.collapseAt - t) < 0.01,
        );
        if (p) {
          const c = this.composition();
          this.vfx.burst(
            c.playerX + (p.start - this.runtime.world.state.worldX) * c.scale,
            c.floor,
            18,
            false,
            c.scale,
          );
        }
      }
      if (cue.type === "audio" && cue.value === "clear")
        this.audio.play("clear");
    };
    this.runtime.world.onJump = (t, inputAt) => {
      this.runtime.score.jump(inputAt);
      this.audio.play("jump", 0.75);
      const c = this.composition();
      this.vfx.burst(
        c.playerX,
        c.floor + this.runtime.world.state.playerY * c.scale,
        7,
        false,
        c.scale,
      );
    };
    this.runtime.world.onLand = () => {
      const t = this.runtime.world.clock.elapsedSeconds;
      this.audio.play("land", 0.7);
      const c = this.composition();
      this.vfx.burst(
        c.playerX,
        c.floor + this.runtime.world.state.playerY * c.scale,
        9,
        false,
        c.scale,
      );
    };
    this.runtime.world.onDeath = () => this.die();
    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      if (pointer.id !== 1 && pointer.id !== 0) return;
      const now = performance.now();
      if (now - this.lastPointer < 65) return;
      this.lastPointer = now;
      this.jump();
    });
    const key = (event: KeyboardEvent) => {
      if (event.repeat) return;
      if (event.code === "Escape") {
        event.preventDefault();
        if (this.mode === "paused") this.resume();
        else this.pause();
        return;
      }
      if (
        event.target instanceof HTMLButtonElement ||
        event.target instanceof HTMLInputElement
      )
        return;
      if (event.code === "Space" || event.code === "ArrowUp") {
        event.preventDefault();
        const now = performance.now();
        if (now - this.lastKey < 65) return;
        this.lastKey = now;
        this.jump();
      }
    };
    const visibility = () => {
      if (document.hidden) this.pause();
    };
    window.addEventListener("keydown", key);
    document.addEventListener("visibilitychange", visibility);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      window.removeEventListener("keydown", key);
      document.removeEventListener("visibilitychange", visibility);
      this.dispose();
    });
    this.scene.launch("deep-time-ui", { run: this });
    this.ui = this.scene.get("deep-time-ui") as DinosaurUIScene;
    this.setMode("ready");
    void this.audio
      .load()
      .then(() => {
        if (!this.sys.isActive()) return;
        this.ready = true;
        this.hooks.ready();
        this.ui?.refresh();
      })
      .catch((error) => {
        if (this.sys.isActive()) this.hooks.fatal(error);
      });
  }
  private setMode(mode: RunMode) {
    const previous = this.mode;
    this.mode = mode;
    this.hooks.mode(mode);
    if (
      !(
        (previous === "running" && mode === "dead") ||
        (previous === "dead" && mode === "running")
      )
    )
      this.ui?.refresh();
  }
  composition() {
    const w = this.runtime.world;
    return this.cameraDirector.compose(
      this.scale.width,
      this.scale.height,
      w.clock.elapsedSeconds + Math.max(0, this.deadAge),
      this.runtime.section.id,
      this.safe,
    );
  }
  jump() {
    if (this.mode === "running") this.runtime.world.queueJump();
  }
  async start(immediate = false) {
    if (!this.ready || this.mode !== "ready" || this.startPending) return;
    this.startPending = true;
    await this.audio.unlock();
    if (!this.sys.isActive()) return;
    if (immediate) { this.beginAttempt(); return; }
    this.setMode("starting");
    this.startingAge = 0;
    this.audio.play("ui");
  }
  private beginAttempt() {
    this.runtime.reset();
    this.dinosaurs.reset();
    this.cameraDirector.reset();
    this.visual.reset();
    this.player.reset();
    this.vfx.reset();
    this.deadAge = -1;
    this.stepFoot = -1;
    this.result = undefined;
    this.attempts++;
    this.record.attempts++;
    this.hooks.best(this.record);
    this.audio.stopAll();
    this.audio.start();
    this.setMode("running");
    this.hooks.started();
  }
  private die() {
    if (this.mode !== "running") return;
    this.failedProgress = this.runtime.world.clock.progress;
    this.deathBest = this.failedProgress > this.record.bestProgress + 1e-6;
    if (this.deathBest) {
      this.record.bestProgress = this.failedProgress;
      this.hooks.best(this.record);
    }
    this.deadAge = 0;
    this.audio.stopMusic();
    this.audio.play("death");
    const c = this.composition();
    this.cameraDirector.impulse(this.runtime.world.clock.elapsedSeconds, 5);
    this.vfx.burst(
      c.playerX,
      c.floor + this.runtime.world.state.playerY * c.scale - 25 * c.scale,
      32,
      true,
      c.scale,
    );
    this.setMode("dead");
    this.hooks.failed(this.failedProgress);
  }
  pause() {
    if (!["running", "dead", "starting"].includes(this.mode)) return;
    this.beforePause = this.mode;
    this.audio.pause();
    this.runtime.world.clearAccumulator();
    this.setMode("paused");
    this.hooks.paused(true);
  }
  resume() {
    if (this.mode !== "paused") return;
    void this.audio.unlock();
    this.setMode(this.beforePause);
    if (this.beforePause === "running")
      this.audio.resume(this.runtime.world.clock.elapsedSeconds);
    this.hooks.paused(false);
  }
  act(action: UIAction) {
    if (action === "start") void this.start();
    if (action === "pause") this.pause();
    if (action === "resume") this.resume();
    if (action === "mute") {
      this.audio.setMuted(!this.audio.muted);
      this.ui?.refresh();
    }
    if (action === "retry" && this.mode === "complete") {
      this.audio.play("ui");
      this.beginAttempt();
    }
    if (action === "leave") this.hooks.leave();
  }
  override update(_time: number, deltaMs: number) {
    const delta = Math.max(0, deltaMs / 1000);
    this.visual.sample(delta);
    if (this.mode === "starting") {
      this.startingAge += delta;
      if (this.startingAge >= 0.3) this.beginAttempt();
    } else if (this.mode === "running") {
      this.runtime.advance(delta);
      const clock = this.runtime.world.clock;
      if (this.mode === "running") {
        this.audio.monitor(clock.elapsedSeconds);
        const foot = Math.floor(
          clock.beat * (clock.sectionIndex === 2 ? 0.5 : 2),
        );
        if (
          foot !== this.stepFoot &&
          clock.sectionIndex >= 1 &&
          clock.sectionIndex <= 2
        ) {
          this.stepFoot = foot;
          this.audio.play("step", clock.sectionIndex === 2 ? 0.45 : 0.28);
          if (clock.sectionIndex === 1) {
            const c = this.composition(),
              anchor = this.dinosaurs.footstep(c, clock.elapsedSeconds);
            if (anchor)
              this.vfx.burst(anchor.x, anchor.y, 4, false, c.scale * 0.5);
          }
        }
        if (clock.elapsedSeconds >= DURATION - 1e-9) {
          this.result = this.runtime.score.result(this.attempts);
          this.record = recordClear(this.record, this.result);
          this.hooks.best(this.record);
          this.audio.stopMusic();
          this.setMode("complete");
          this.hooks.cleared(this.result);
        }
      }
    } else if (this.mode === "dead") {
      this.deadAge += delta;
      if (this.deadAge >= RETRY_SECONDS) this.beginAttempt();
    }
    const t = this.runtime.world.clock.elapsedSeconds,
      c = this.composition(),
      section = this.runtime.section.id,
      low = this.visual.quality === "low";
    this.bg.render(
      c,
      this.runtime.world.state.worldX,
      t,
      section,
      this.visual.environment(section),
      this.reduced,
      low,
    );
    this.dinosaurs.render(c, t, section, low);
    this.terrain.render(c, this.runtime.world, this.hitboxes);
    this.player.render(c, this.runtime.world.state, this.deadAge);
    const renderDelta =
      this.mode === "paused"
        ? 0
        : this.mode === "dead" && this.deadAge < 0.07
          ? 0
          : Math.min(delta, 0.05);
    this.vfx.render(
      c,
      t,
      renderDelta,
      section,
      this.visual.quality,
      this.visual.flashAlpha(t),
      this.deadAge,
    );
    this.boundary.render(c, t);
  }
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.audio.dispose();
    if (this.player) this.player.dispose();
    else disposePlayerModel(this.model);
  }
  // These methods are wired only by a development host; production exposes no shortcuts.
  debugSeek(section: number) {
    if (!this.devEnabled) return;
    const invincible = this.runtime.world.previewInvincible;
    this.beginAttempt();
    this.runtime.world.previewInvincible = true;
    const target = Math.round((section * 12.8) / FIXED_DT);
    while (this.runtime.world.clock.ticks < target)
      this.runtime.advance(
        Math.min(0.25, (target - this.runtime.world.clock.ticks) * FIXED_DT),
      );
    this.runtime.world.previewInvincible = invincible;
    this.audio.start(this.runtime.world.clock.elapsedSeconds);
  }
  debugTick(seconds: number) {
    if (
      !this.devEnabled ||
      !["running", "dead", "starting"].includes(this.mode)
    )
      return;
    let remaining = seconds;
    while (
      remaining > 1e-9 &&
      ["running", "dead", "starting"].includes(this.mode)
    ) {
      const dt = Math.min(0.05, remaining);
      this.update(0, dt * 1000);
      remaining -= dt;
    }
  }
}
