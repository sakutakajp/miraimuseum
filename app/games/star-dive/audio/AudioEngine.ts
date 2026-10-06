import { BPM, type DiveEvent } from "../config";
type Quantize = "none" | "sixteenth" | "beat";
export class AudioEngine {
  context?: AudioContext;
  private master?: GainNode;
  private music?: GainNode;
  private sfx?: GainNode;
  private compressor?: DynamicsCompressorNode;
  private timer?: ReturnType<typeof setTimeout>;
  private nodes = new Set<AudioScheduledSourceNode>();
  private origin = 0;
  private nextBeat = 0;
  private active = false;
  muted = false;
  risk = 1;
  section = "dive";
  get stageTime() {
    return this.context ? this.context.currentTime - this.origin : 0;
  }
  get currentTime() {
    return this.context?.state === "running"
      ? this.context.currentTime
      : performance.now() / 1000;
  }
  async unlock() {
    if (typeof window === "undefined") return;
    try {
      if (!this.context) {
        this.context = new AudioContext();
        this.master = this.context.createGain();
        this.music = this.context.createGain();
        this.sfx = this.context.createGain();
        this.compressor = this.context.createDynamicsCompressor();
        this.master.gain.value = this.muted ? 0 : 0.65;
        this.music.connect(this.master);
        this.sfx.connect(this.master);
        this.master.connect(this.compressor);
        this.compressor.connect(this.context.destination);
      }
      await this.context.resume();
    } catch {}
  }
  start(time = 0) {
    clearTimeout(this.timer);
    this.active = true;
    if (this.context?.state === "running") {
      this.origin = this.context.currentTime - time;
      this.nextBeat = Math.ceil((time * BPM) / 60);
      this.schedule();
    }
  }
  private schedule = () => {
    if (!this.active || !this.context || this.context.state !== "running")
      return;
    const now = this.context.currentTime;
    const beatLength = 60 / BPM;
    while (this.origin + this.nextBeat * beatLength < now + 0.13) {
      const at = this.origin + this.nextBeat * beatLength;
      const step = this.nextBeat % 16;
      const notes = [
        220, 0, 329.63, 0, 261.63, 0, 392, 0, 220, 0, 293.66, 0, 261.63, 0,
        329.63, 0,
      ];
      if (
        at >= now &&
        !(at - this.origin >= 75.4 && at - this.origin < 75.4 + 60 / BPM)
      ) {
        if (this.nextBeat % 4 === 0)
          this.tone(55, 0.16, 0.24, "sine", at, "music", 28);
        if (notes[step])
          this.tone(notes[step]!, 0.23, 0.06, "triangle", at, "music");
        if (this.section !== "dive") this.noise(0.05, 0.025, at, "music");
        if (this.risk >= 2)
          this.tone(
            660 + (step % 4) * 110,
            0.09,
            0.028,
            "sine",
            at + beatLength / 2,
            "music",
          );
      }
      this.nextBeat++;
    }
    this.timer = setTimeout(this.schedule, 25);
  };
  private tone(
    freq: number,
    duration: number,
    volume: number,
    type: OscillatorType,
    at: number,
    bus: "music" | "sfx",
    end = freq,
  ) {
    const ctx = this.context;
    if (!ctx || ctx.state !== "running") return;
    const osc = ctx.createOscillator(),
      gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, at);
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, end), at + duration);
    gain.gain.setValueAtTime(0.001, at);
    gain.gain.linearRampToValueAtTime(volume, at + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.001, at + duration);
    osc.connect(gain);
    gain.connect((bus === "music" ? this.music : this.sfx)!);
    this.nodes.add(osc);
    osc.onended = () => {
      this.nodes.delete(osc);
      osc.disconnect();
      gain.disconnect();
    };
    osc.start(at);
    osc.stop(at + duration + 0.01);
  }
  private noise(
    duration: number,
    volume: number,
    at: number,
    bus: "music" | "sfx",
  ) {
    const ctx = this.context;
    if (!ctx) return;
    const buffer = ctx.createBuffer(
        1,
        Math.ceil(duration * ctx.sampleRate),
        ctx.sampleRate,
      ),
      data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++)
      data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    const source = ctx.createBufferSource(),
      gain = ctx.createGain();
    source.buffer = buffer;
    gain.gain.value = volume;
    source.connect(gain);
    gain.connect((bus === "music" ? this.music : this.sfx)!);
    this.nodes.add(source);
    source.onended = () => {
      this.nodes.delete(source);
      source.disconnect();
      gain.disconnect();
    };
    source.start(at);
  }
  effect(event: DiveEvent, quantize: Quantize = "none") {
    const ctx = this.context;
    if (!ctx || ctx.state !== "running" || this.muted) return;
    const unit = 60 / BPM / (quantize === "sixteenth" ? 4 : 1);
    const at =
      quantize === "none"
        ? ctx.currentTime
        : this.origin +
          Math.ceil((ctx.currentTime - this.origin) / unit) * unit;
    const tones: Record<
      string,
      [number, number, number, OscillatorType, number]
    > = {
      shot: [950, 0.035, 0.008, "triangle", 500],
      hit: [900, 0.07, 0.045, "triangle", 240],
      destroy: [180, 0.22, 0.13, "sawtooth", 45],
      near: [280, 0.25, 0.065, "sine", 1400],
      damage: [160, 0.2, 0.12, "square", 45],
      gate: [80, 0.55, 0.13, "sawtooth", 22],
      climax: [110, 0.7, 0.08, "sawtooth", 880],
      discovery: [660, 0.4, 0.075, "sine", 990],
    };
    const p = tones[event.kind];
    if (p) this.tone(p[0], p[1], p[2], p[3], at, "sfx", p[4]);
    if (["destroy", "gate", "near", "damage"].includes(event.kind))
      this.noise(
        event.big ? 0.4 : 0.14,
        event.kind === "near" ? 0.1 : 0.08,
        at,
        "sfx",
      );
  }
  setMuted(value: boolean) {
    this.muted = value;
    this.master?.gain.setTargetAtTime(
      value ? 0 : 0.65,
      this.context!.currentTime,
      0.02,
    );
  }
  pause() {
    this.active = false;
    clearTimeout(this.timer);
    for (const node of this.nodes) {
      try {
        node.stop();
      } catch {}
    }
    this.nodes.clear();
    if (this.context?.state === "running") void this.context.suspend();
  }
  dispose() {
    this.pause();
    void this.context?.close();
    this.context = undefined;
  }
}
