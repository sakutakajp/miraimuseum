import { SCENES } from "./config";
import type { CoreState, LandingScene } from "./types";
export const clamp = (value: number, min = 0, max = 1) =>
  Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));
export const mix = (a: number, b: number, t: number) => a + (b - a) * t;
export function smoothstep(a: number, b: number, value: number) {
  const t = clamp((value - a) / (b - a));
  return t * t * (3 - 2 * t);
}
export function damp(
  current: number,
  target: number,
  lambda: number,
  delta: number,
) {
  return mix(current, target, 1 - Math.exp(-lambda * clamp(delta, 0, 0.064)));
}
export function dampScroll(
  current: number,
  target: number,
  lambda: number,
  delta: number,
) {
  const next = damp(current, target, lambda, delta);
  // Exponential damping approaches a boundary forever. Resolve sub-pixel
  // differences so stopping at exactly 100/360vh actually enters the next scene.
  return Math.abs(next - target) < 0.0001 ? target : next;
}
export function mapProgress(scrollVh: number): {
  globalProgress: number;
  scene: LandingScene;
  sceneProgress: number;
} {
  const value = clamp(scrollVh, 0, SCENES.end);
  if (value < SCENES.thresholdEnd)
    return {
      globalProgress: value / SCENES.end,
      scene: "threshold",
      sceneProgress: value,
    };
  if (value < SCENES.scaleEnd)
    return {
      globalProgress: value / SCENES.end,
      scene: "scale-shift",
      sceneProgress: (value - 1) / 2.6,
    };
  return {
    globalProgress: value / SCENES.end,
    scene: "connected",
    sceneProgress: (value - 3.6) / 1.6,
  };
}
export function classification(scrollVh: number): CoreState {
  if (scrollVh < 1 || scrollVh >= 3.6) return "";
  const p = (scrollVh - 1) / 2.6;
  return p < 0.18
    ? "SPACE"
    : p < 0.38
      ? "LIFE"
      : p < 0.58
        ? "MATTER"
        : p < 0.79
          ? "MACHINE"
          : "";
}
export function boneTransition(scrollVh: number) {
  return smoothstep(3.6, 3.6 + 1.6 * 0.14, scrollVh);
}
export function preserveProgressOnResize(
  scrollY: number,
  previousHeight: number,
  nextHeight: number,
) {
  return previousHeight > 0 && nextHeight > 0
    ? (scrollY / previousHeight) * nextHeight
    : scrollY;
}
