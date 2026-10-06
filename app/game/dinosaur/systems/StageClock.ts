import {
  BEAT_SECONDS,
  DURATION,
  FIXED_DT,
  SECTION_SECONDS,
} from "../config/gameplay";
export class StageClock {
  constructor(public ticks = 0) {}
  get elapsedSeconds() {
    return this.ticks * FIXED_DT;
  }
  get beat() {
    return this.elapsedSeconds / BEAT_SECONDS;
  }
  get bar() {
    return Math.min(48, Math.floor(this.beat / 4) + 1);
  }
  get sectionIndex() {
    return Math.min(
      5,
      Math.floor((this.ticks + 1e-8) / (SECTION_SECONDS / FIXED_DT)),
    );
  }
  get sectionProgress() {
    return Math.min(
      1,
      (this.elapsedSeconds - this.sectionIndex * SECTION_SECONDS) /
        SECTION_SECONDS,
    );
  }
  get progress() {
    return Math.min(1, this.elapsedSeconds / DURATION);
  }
  reset() {
    this.ticks = 0;
  }
}
