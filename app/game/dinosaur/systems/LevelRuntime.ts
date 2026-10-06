import { FixedStepWorld } from "./FixedStepWorld";
import { ScoreSystem } from "./ScoreSystem";
import { TriggerSystem } from "./TriggerSystem";
import type { Cue, Level } from "../types";
export class LevelRuntime {
  readonly world: FixedStepWorld;
  readonly score: ScoreSystem;
  readonly triggers: TriggerSystem;
  onCue?: (cue: Cue) => void;
  constructor(readonly level: Level) {
    this.world = new FixedStepWorld(level);
    this.score = new ScoreSystem(level.challenges);
    this.triggers = new TriggerSystem(level.cues);
  }
  get section() {
    return this.level.sections[this.world.clock.sectionIndex]!;
  }
  advance(delta: number) {
    this.world.advance(delta, (previous, current) =>
      this.triggers.crossing(previous, current, (c) => this.onCue?.(c)),
    );
  }
  reset() {
    this.world.reset();
    this.score.reset();
    this.triggers.reset();
  }
}
