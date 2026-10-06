import type { QualityTier } from "./types";
export const SCENES = { thresholdEnd: 1, scaleEnd: 3.6, end: 5.2 } as const;
// 520 viewport-heights of travel, plus the single sticky viewport itself.
export const TRACK_VIEWPORTS = SCENES.end + 1;
export const PALETTE = {
  obsidian: "#08090b",
  bone: "#f1efe8",
  gray: "#a9a9a4",
};
export const CAMERA = {
  desktop: {
    fov: 37,
    near: 0.1,
    far: 40,
    thresholdZ: 8.2,
    thresholdX: 1.55,
    thresholdY: -0.06,
    scaleX: 0.45,
    scaleY: 0.1,
    scaleZ: 3.75,
    connectedZ: 9.2,
  },
  mobile: {
    fov: 45,
    near: 0.1,
    far: 40,
    thresholdZ: 7.5,
    thresholdX: 0,
    thresholdY: 0.83,
    scaleX: 0,
    scaleY: 0.42,
    scaleZ: 4.5,
    connectedZ: 10.5,
  },
} as const;
export const QUALITY: Record<
  QualityTier,
  {
    dpr: number;
    particles: number;
    detail: number;
    octaves: number;
    grain: number;
  }
> = {
  high: { dpr: 1.75, particles: 2800, detail: 32, octaves: 4, grain: 0.025 },
  medium: { dpr: 1.35, particles: 1600, detail: 22, octaves: 3, grain: 0.02 },
  low: { dpr: 1, particles: 650, detail: 12, octaves: 2, grain: 0.01 },
  static: { dpr: 1, particles: 0, detail: 0, octaves: 1, grain: 0.01 },
};
