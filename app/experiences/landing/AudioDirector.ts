/** A room-sized, deliberately quiet resonance. Created only by a user gesture. */
export class AudioDirector {
  private context?: AudioContext;
  private gain?: GainNode;
  private sources: OscillatorNode[] = [];
  enabled = false;
  async toggle() {
    if (!this.context) {
      this.context = new AudioContext();
      this.gain = this.context.createGain();
      this.gain.gain.value = 0;
      const filter = this.context.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 380;
      this.gain.connect(filter);
      filter.connect(this.context.destination);
      for (const frequency of [55, 82.46, 110.16]) {
        const oscillator = this.context.createOscillator();
        oscillator.type = "sine";
        oscillator.frequency.value = frequency;
        oscillator.connect(this.gain);
        oscillator.start();
        this.sources.push(oscillator);
      }
    }
    await this.context.resume();
    this.enabled = !this.enabled;
    const now = this.context.currentTime;
    this.gain!.gain.cancelScheduledValues(now);
    this.gain!.gain.setTargetAtTime(this.enabled ? 0.012 : 0, now, 0.35);
    return this.enabled;
  }
  visibility(hidden: boolean) {
    if (!this.context) return;
    if (hidden) void this.context.suspend();
    else if (this.enabled) void this.context.resume();
  }
  dispose() {
    this.sources.forEach((source) => {
      source.stop();
      source.disconnect();
    });
    this.gain?.disconnect();
    void this.context?.close();
  }
}
