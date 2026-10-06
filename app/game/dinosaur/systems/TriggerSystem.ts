import { BEAT_SECONDS } from "../config/gameplay";
import type { Cue } from "../types";
export class TriggerSystem {
  private cursor = 0;
  readonly log: string[] = [];
  constructor(private readonly cues: readonly Cue[]) {}
  crossing(previous: number, current: number, fire: (cue: Cue) => void) {
    while (this.cursor < this.cues.length) {
      const cue = this.cues[this.cursor]!;
      const at = cue.beat * BEAT_SECONDS;
      if (at > current + 1e-9) break;
      this.cursor++;
      if (at >= previous - 1e-9) {
        fire(cue);
        this.log.push(cue.id);
      }
    }
  }
  reset(time = 0) {
    this.cursor = this.cues.findIndex((c) => c.beat * BEAT_SECONDS >= time);
    if (this.cursor < 0) this.cursor = this.cues.length;
    this.log.length = 0;
  }
}
