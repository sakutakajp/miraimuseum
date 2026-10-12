import { DURATION, RETRY_SECONDS } from "../../game/dinosaur/config/gameplay";
import { LevelRuntime } from "../../game/dinosaur/systems/LevelRuntime";
import { recordClear } from "../../game/dinosaur/systems/records";
import type { ClearResult, Cue, DeepTimeRecord, RunMode } from "../../game/dinosaur/types";
import type { RunStage } from "./stage";
export interface RunEvents { mode(mode: RunMode): void; record(record: DeepTimeRecord): void; failed(progress: number): void; cleared(result: ClearResult): void; cue(cue: Cue): void; jump(): void; land(): void; retry(): void }
/** Game rules own their clock. Babylon rendering consumes this state, never determines collisions. */
export class RunController {
  readonly runtime: LevelRuntime;
  mode: RunMode = "ready";
  attempts = 0;
  result?: ClearResult;
  private age = 0;
  private beforePause: RunMode = "running";
  constructor(readonly stage: RunStage, public record: DeepTimeRecord, private events: RunEvents) {
    this.runtime = new LevelRuntime(stage.rules);
    this.runtime.onCue = cue => events.cue(cue);
    this.runtime.world.onJump = (_time, inputAt) => { this.runtime.score.jump(inputAt); events.jump(); };
    this.runtime.world.onLand = () => events.land();
    this.runtime.world.onDeath = () => this.die();
  }
  private setMode(mode: RunMode) { this.mode = mode; this.events.mode(mode); }
  start(immediate = false) {
    if (this.mode !== "ready") return;
    if (immediate) this.retry(); else { this.age = 0; this.setMode("starting"); }
  }
  retry() {
    this.runtime.reset(); this.runtime.world.clearAccumulator(); this.result = undefined; this.age = 0;
    this.attempts++; this.record = { ...this.record, attempts: this.record.attempts + 1 };
    this.events.record(this.record); this.setMode("running"); this.events.retry();
  }
  jump() { if (this.mode === "running") this.runtime.world.queueJump(); }
  tick(delta: number) {
    if (this.mode === "starting" || this.mode === "dead") {
      this.age += Math.max(0, delta);
      if (this.age >= (this.mode === "starting" ? 0.3 : RETRY_SECONDS)) this.retry();
    } else if (this.mode === "running") {
      this.runtime.advance(delta);
      if (this.mode === "running" && this.runtime.world.clock.elapsedSeconds >= DURATION - 1e-9) {
        this.result = this.runtime.score.result(this.attempts);
        this.record = recordClear(this.record, this.result); this.events.record(this.record);
        this.setMode("complete"); this.events.cleared(this.result);
      }
    }
  }
  private die() {
    if (this.mode !== "running") return;
    const progress = this.runtime.world.clock.progress;
    if (progress > this.record.bestProgress) { this.record = { ...this.record, bestProgress: progress }; this.events.record(this.record); }
    this.age = 0; this.setMode("dead"); this.events.failed(progress);
  }
  pause() {
    if (!["running", "starting", "dead"].includes(this.mode)) return;
    this.beforePause = this.mode; this.runtime.world.clearAccumulator(); this.setMode("paused");
  }
  resume() { if (this.mode === "paused") this.setMode(this.beforePause); }
}
