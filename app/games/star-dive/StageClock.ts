import { BPM } from "./config";
/** Pausing reanchors the audio clock; wall-clock gaps never advance the stage. */
export class StageClock {
  private anchor = 0;
  private saved = 0;
  paused = true;
  scale = 1;
  constructor(private source: () => number = () => performance.now() / 1000) {}
  get time() {
    return (
      this.saved +
      (this.paused ? 0 : (this.source() - this.anchor) * this.scale)
    );
  }
  get beat() {
    return (this.time * BPM) / 60;
  }
  get bar() {
    return Math.floor(this.beat / 4) + 1;
  }
  get sixteenth() {
    return Math.floor(this.beat * 4);
  }
  start() {
    this.saved = 0;
    this.anchor = this.source();
    this.paused = false;
  }
  pause() {
    if (!this.paused) {
      this.saved = this.time;
      this.paused = true;
    }
  }
  resume() {
    if (this.paused) {
      this.anchor = this.source();
      this.paused = false;
    }
  }
  seek(time: number) {
    this.saved = Math.max(0, time);
    this.anchor = this.source();
  }
  setScale(scale: number) {
    const time = this.time;
    this.scale = scale;
    this.seek(time);
  }
  useSource(source: () => number) {
    const time = this.time;
    this.source = source;
    this.seek(time);
  }
}
