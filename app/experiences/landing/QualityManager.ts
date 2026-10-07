import { QUALITY } from "./config";
import type { QualityTier } from "./types";
const TIERS: QualityTier[] = ["high", "medium", "low", "static"];
export class QualityManager {
  tier: QualityTier;
  resolutionScale = 1;
  private frames = 0;
  private total = 0;
  private elapsed = 0;
  private warmed = 0;
  private lastPixelRatio = Infinity;
  private minimumTier: "low" | "static";
  constructor(device: {
    mobile: boolean;
    cores?: number;
    reducedMotion: boolean;
    minimumTier?: "low" | "static";
  }) {
    this.minimumTier = device.minimumTier ?? "static";
    this.tier =
      device.cores && device.cores <= 2
        ? "low"
        : device.mobile
          ? "medium"
          : "high";
    if (device.reducedMotion && device.cores && device.cores <= 2 && this.minimumTier === "static")
      this.tier = "static";
  }
  sample(delta: number) {
    if (!Number.isFinite(delta) || delta <= 0 || this.tier === "static")
      return false;
    // Bound an isolated compilation/OS stall, but still count persistent very
    // slow frames. Ignoring every interval above 250ms would strand weak GPUs.
    const frameTime = Math.min(delta, 0.25);
    this.warmed += frameTime;
    if (this.warmed < 3) return false;
    this.total += frameTime;
    this.elapsed += frameTime;
    this.frames++;
    if (this.elapsed < 4) return false;
    const average = this.total / this.frames;
    this.resetWindow();
    if (average > 1 / 42) {
      // Reduce fill-rate before reducing geometry/particles. Never upgrade this visit.
      if (this.resolutionScale === 1) this.resolutionScale = 0.8;
      else {
        const next = TIERS[Math.min(TIERS.indexOf(this.tier) + 1, TIERS.indexOf(this.minimumTier))]!;
        if (next === this.tier) return false;
        this.tier = next;
        this.resolutionScale = 1;
      }
      return true;
    }
    return false;
  }
  resetWindow() {
    this.frames = 0;
    this.total = 0;
    this.elapsed = 0;
  }
  fallback() {
    this.tier = "static";
    this.resetWindow();
  }
  pixelRatio(deviceDpr: number) {
    const next = Math.max(
      0.75,
      Math.min(deviceDpr || 1, QUALITY[this.tier].dpr) * this.resolutionScale,
    );
    // A tier change must not undo the earlier resolution reduction on DPR=1
    // displays. Resizing also preserves the visit's downward-only policy.
    this.lastPixelRatio = Math.min(this.lastPixelRatio, next);
    return this.lastPixelRatio;
  }
}
