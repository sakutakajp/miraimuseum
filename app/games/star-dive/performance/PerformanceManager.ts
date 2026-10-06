export type Quality = "high" | "medium" | "low";
export const tiers = {
  high: { ratio: 1.75, particles: 160, bloom: 0.8, segments: 24 },
  medium: { ratio: 1.25, particles: 100, bloom: 0.55, segments: 16 },
  low: { ratio: 0.85, particles: 48, bloom: 0.25, segments: 8 },
};
export class PerformanceManager {
  quality: Quality;
  average = 1 / 60;
  private elapsed = 0;
  private stable = 0;
  forced = false;
  constructor(quality: Quality = "medium") {
    this.quality = quality;
  }
  get settings() {
    return tiers[this.quality];
  }
  update(dt: number) {
    this.average = this.average * 0.98 + Math.min(dt, 0.1) * 0.02;
    this.elapsed += dt;
    if (this.forced || this.elapsed < 4) return false;
    this.elapsed = 0;
    if (this.average > 0.033 && this.quality !== "low") {
      this.quality = this.quality === "high" ? "medium" : "low";
      this.stable = 0;
      return true;
    }
    if (this.average < 0.019) {
      this.stable += 4;
      if (this.stable >= 16 && this.quality !== "high") {
        this.quality = this.quality === "low" ? "medium" : "high";
        this.stable = 0;
        return true;
      }
    } else this.stable = 0;
    return false;
  }
  force(quality: Quality) {
    this.quality = quality;
    this.forced = true;
  }
}
