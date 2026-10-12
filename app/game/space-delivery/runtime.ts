import { advanceFrame, launch, predict } from "./physics";
import type { Flight, Mode, Shot, Stage, Vec } from "./types";
export class DeliveryRuntime {
  mode: Mode = "ready";
  stage: Stage;
  shot: Shot = { angle: 0, speed: 85 };
  flight: Flight;
  trail: Vec[] = [];
  previousTrail: Vec[] = [];
  prediction: ReturnType<typeof predict>;
  failures = 0;
  assist = false;
  private accumulator = 0;
  private previousMode: Mode = "ready";
  constructor(
    stage: Stage,
    private change: () => void,
    private event: (kind: "launch" | "star" | "success" | "failure") => void,
  ) {
    this.stage = stage;
    this.flight = launch(stage, this.shot);
    this.prediction = this.makePrediction();
  }
  private makePrediction() {
    return predict(
      this.stage,
      this.shot,
      this.assist || this.stage.id <= 2 ? this.stage.maxTime : 2,
    );
  }
  setShot(shot: Shot) {
    if (!["ready", "aiming"].includes(this.mode)) return;
    this.shot = { ...shot };
    this.prediction = this.makePrediction();
    this.change();
  }
  aim() {
    if (this.mode === "ready") {
      this.mode = "aiming";
      this.change();
    }
  }
  cancel() {
    if (this.mode === "aiming") {
      this.mode = "ready";
      this.change();
    }
  }
  fire() {
    if (!["ready", "aiming"].includes(this.mode)) return;
    this.flight = launch(this.stage, this.shot);
    this.trail = [this.flight.position];
    this.accumulator = 0;
    this.mode = "flying";
    this.event("launch");
    this.change();
  }
  retry() {
    if (this.mode === "flying" || this.mode === "failure")
      this.previousTrail = [...this.trail];
    this.mode = "ready";
    this.accumulator = 0;
    this.flight = launch(this.stage, this.shot);
    this.trail = [];
    this.prediction = this.makePrediction();
    this.change();
  }
  tick(elapsed: number) {
    if (this.mode !== "flying") return;
    const result = advanceFrame(
      this.stage,
      this.flight,
      this.accumulator,
      elapsed,
    );
    this.flight = result.state;
    this.accumulator = result.accumulator;
    this.trail.push(...result.points);
    for (const event of result.events)
      if (event.kind === "star") this.event("star");
    if (this.flight.outcome !== "flying") {
      this.mode = this.flight.outcome;
      if (this.mode === "failure") {
        this.failures++;
        this.previousTrail = [...this.trail];
      }
      this.event(this.mode);
      this.change();
    } else this.change();
  }
  pause() {
    if (this.mode === "paused") return;
    this.previousMode = this.mode === "aiming" ? "ready" : this.mode;
    this.mode = "paused";
    this.accumulator = 0;
    this.change();
  }
  resume() {
    if (this.mode === "paused") {
      this.mode = this.previousMode;
      this.accumulator = 0;
      this.change();
    }
  }
  select(stage: Stage) {
    this.stage = stage;
    this.failures = 0;
    this.assist = false;
    this.previousTrail = [];
    this.shot = { angle: 0, speed: 85 };
    this.retry();
  }
  help() {
    this.assist = !this.assist;
    this.prediction = this.makePrediction();
    this.change();
  }
}
