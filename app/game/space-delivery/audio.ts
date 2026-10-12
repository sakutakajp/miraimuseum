export class DeliveryAudio {
  private context?: AudioContext;
  private muted = false;
  private nodes = new Set<OscillatorNode>();
  private lastStretch = 0;
  async unlock() {
    try {
      this.context ??= new AudioContext();
      if (this.context.state === "suspended") await this.context.resume();
    } catch {
      /* Sound is optional. */
    }
  }
  setMuted(value: boolean) {
    this.muted = value;
    if (value) this.silence();
  }
  play(kind: "stretch" | "launch" | "star" | "success" | "failure") {
    if (!this.context || this.muted || this.context.state !== "running") return;
    const now = this.context.currentTime;
    if (kind === "stretch" && now - this.lastStretch < 0.09) return;
    if (kind === "stretch") this.lastStretch = now;
    const notes = {
      stretch: [190],
      launch: [360, 540],
      star: [880, 1100],
      success: [523, 659, 784, 1047],
      failure: [220, 160],
    }[kind];
    notes.forEach((hz, i) => {
      const oscillator = this.context!.createOscillator(),
        gain = this.context!.createGain(),
        time = now + i * 0.09;
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(hz, time);
      gain.gain.setValueAtTime(0, time);
      gain.gain.linearRampToValueAtTime(0.045, time + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.17);
      oscillator.connect(gain);
      gain.connect(this.context!.destination);
      oscillator.start(time);
      oscillator.stop(time + 0.18);
      this.nodes.add(oscillator);
      oscillator.onended = () => {
        this.nodes.delete(oscillator);
        oscillator.disconnect();
        gain.disconnect();
      };
    });
  }
  silence() {
    for (const node of this.nodes) {
      try {
        node.stop();
      } catch {}
    }
    this.nodes.clear();
  }
  dispose() {
    this.silence();
    void this.context?.close();
    this.context = undefined;
  }
}
