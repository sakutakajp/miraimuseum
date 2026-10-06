import type { SectionId } from "../types";
export interface Composition {
  width: number;
  height: number;
  scale: number;
  floor: number;
  playerX: number;
  recoil: number;
}
export class CameraDirector {
  private impulseAt = -100;
  private strength = 0;
  constructor(readonly reduced: boolean) {}
  impulse(at: number, strength: number) {
    this.impulseAt = at;
    this.strength = strength;
  }
  compose(
    width: number,
    height: number,
    t: number,
    section: SectionId,
  ): Composition {
    const baseScale = width < 700 ? width / 420 : Math.min(1.28, height / 800);
    const ending =
      section === "boundary" ? Math.max(0, Math.min(1, (t - 70) / 5)) : 0;
    const scale =
      baseScale * (1 - ending * 0.12) * (section === "fallout" ? 0.98 : 1);
    const pressure =
      section === "predator"
        ? Math.min(1, (t - 25.6) / 5)
        : section === "flash"
          ? Math.max(0, 1 - (t - 38.4) / 2)
          : 0;
    const age = t - this.impulseAt;
    const recoil =
      this.reduced || age < 0 || age > 0.35
        ? 0
        : Math.sin(age * 48) * Math.exp(-age * 12) * this.strength;
    return {
      width,
      height,
      scale,
      floor: height * 0.755,
      playerX:
        width * (0.28 - pressure * 0.025 - (section === "fallout" ? 0.02 : 0)) +
        recoil,
      recoil,
    };
  }
  reset() {
    this.impulseAt = -100;
  }
}
