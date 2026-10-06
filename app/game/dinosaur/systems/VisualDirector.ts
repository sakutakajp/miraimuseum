import type { Quality } from "../config/visual";
import type { SectionId } from "../types";
// Quality is presentation-only. This class never touches world state or input.
export class VisualDirector {
  quality: Quality = "high";
  private slowSeconds = 0;
  flashAt = -100;
  constructor(readonly reduced: boolean) {}
  sample(delta: number) {
    if (delta > 0.029 && delta < 0.2) this.slowSeconds += delta;
    else this.slowSeconds = Math.max(0, this.slowSeconds - delta * 0.3);
    if (this.slowSeconds > 3) {
      this.quality = this.quality === "high" ? "medium" : "low";
      this.slowSeconds = 0;
    }
  }
  flash(t: number) {
    this.flashAt = t;
  }
  flashAlpha(t: number) {
    const age = t - this.flashAt;
    return age < 0
      ? 0
      : Math.max(0, 1 - age / (this.reduced ? 0.16 : 0.32)) *
          (this.reduced ? 0.18 : 0.76);
  }
  environment(section: SectionId) {
    return section === "flash"
      ? 0xb6aea0
      : section === "fallout"
        ? 0x908b80
        : section === "boundary"
          ? 0xb7b6b0
          : 0xffffff;
  }
  reset() {
    this.flashAt = -100;
  }
}
