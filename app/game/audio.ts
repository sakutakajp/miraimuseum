// Small original score, synthesized locally. No external assets or autoplay.
import type { WorldId } from "../data/worlds";
class MuseumAudio {
  private context?: AudioContext;
  private timer?: ReturnType<typeof setInterval>;
  private notes = new Set<OscillatorNode>();
  private step = 0;
  muted = false;
  private running = false;
  private theme: WorldId = "dinosaur";
  async unlock() {
    if (typeof window === "undefined") return;
    try {
      this.context ??= new AudioContext();
      if (this.context.state === "suspended") await this.context.resume();
    } catch {
      /* Audio is optional on browsers without Web Audio support. */
    }
  }
  private tone(
    frequency: number,
    duration = 0.16,
    volume = 0.04,
    type: OscillatorType = "triangle",
  ) {
    const ctx = this.context;
    if (!ctx || this.muted || ctx.state !== "running") return;
    const osc = ctx.createOscillator(),
      gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = frequency;
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    this.notes.add(osc);
    osc.onended = () => {
      this.notes.delete(osc);
      osc.disconnect();
      gain.disconnect();
    };
    osc.start();
    osc.stop(ctx.currentTime + duration + 0.02);
  }
  setMuted(value: boolean) {
    this.muted = value;
    if (value) this.silence();
  }
  private silence() {
    for (const osc of this.notes) {
      try {
        osc.stop();
      } catch {}
    }
    this.notes.clear();
  }
  start(theme: WorldId = this.theme) {
    this.stop();
    this.running = true;
    this.step = 0;
    this.theme = theme;
    const melody = {
      dinosaur: [64, 67, 69, 0, 67, 64, 62, 0, 60, 64, 67, 0, 62, 64, 60, 0],
      space: [69, 76, 0, 81, 0, 76, 74, 0, 72, 0, 79, 0, 76, 74, 69, 0],
      ocean: [62, 65, 69, 0, 67, 65, 62, 0, 60, 62, 65, 0, 69, 67, 62, 0],
    }[theme];
    this.timer = setInterval(() => {
      const note = melody[this.step % melody.length]!;
      if (note) this.tone(440 * 2 ** ((note - 69) / 12), 0.29, 0.025);
      if (this.step % 4 === 0)
        this.tone(this.step % 16 < 8 ? 130.81 : 174.61, 0.38, 0.018, "sine");
      this.step++;
    }, theme === "space" ? 380 : theme === "ocean" ? 330 : 290);
  }
  pause() {
    if (this.timer) clearInterval(this.timer);
    this.timer = undefined;
    this.silence();
  }
  resume() {
    if (this.running) this.start();
  }
  stop() {
    this.running = false;
    this.pause();
  }
  jump() {
    this.tone(420, 0.09, 0.035);
    this.tone(650, 0.13, 0.02);
  }
  discover() {
    this.tone(523.25, 0.18);
    setTimeout(() => {
      if (this.running) this.tone(783.99, 0.24);
    }, 90);
  }
  bump() {
    this.tone(130, 0.17, 0.045, "triangle");
  }
  finish() {
    this.tone(523.25, 0.3);
    setTimeout(() => this.tone(659.25, 0.3), 120);
    setTimeout(() => this.tone(783.99, 0.55), 240);
  }
}
export const museumAudio = new MuseumAudio();
