import { clamp, smoothstep } from "./math";

/** Observations change; the planet's coordinates and silhouette never do. */
const layerWeight = (p: number, start: number, end: number, residual: number) =>
  smoothstep(start, start + 0.075, p) *
  (1 - smoothstep(end, end + 0.085, p) * (1 - residual));
export function earthObservation(
  scrollVh: number,
  reducedMotion = false,
  out = {
    light: 0,
    life: 0,
    matter: 0,
    machine: 0,
    connected: 0,
    dissolve: 0,
    motion: 0,
  },
) {
  const p = clamp((scrollVh - 1) / 2.6);
  const connected = smoothstep(0.78, 0.835, p);
  out.light = smoothstep(0.12, 1.22, scrollVh);
  out.life = Math.max(layerWeight(p, 0.14, 0.34, 0.16), connected * 0.82);
  out.matter = Math.max(layerWeight(p, 0.34, 0.54, 0.12), connected * 0.78);
  out.machine = Math.max(layerWeight(p, 0.54, 0.76, 0.25), connected * 0.85);
  out.connected = connected;
  // A real hold for simultaneous observations precedes the first breakup.
  out.dissolve = smoothstep(0.87, 1, p);
  out.motion = reducedMotion ? 0 : 1;
  return out;
}

export const FIGURES = [
  "orbit",
  "life",
  "crystal",
  "network",
  "contour",
] as const;
export function figureWeights(
  scrollVh: number,
  out = {
    orbit: 0,
    life: 0,
    crystal: 0,
    network: 0,
    contour: 0,
  },
) {
  const phase = clamp((scrollVh - 3.6) / 1.6) * 4.8;
  const index = Math.min(4, Math.floor(phase));
  const blend = smoothstep(0.15, 0.85, phase - index);
  for (let i = 0; i < FIGURES.length; i++)
    out[FIGURES[i]!] =
      i === index ? (index === 4 ? 1 : 1 - blend) : i === index + 1 ? blend : 0;
  return out;
}

export function earthPhase(scrollVh: number) {
  if (scrollVh < 1) return "threshold";
  const p = (scrollVh - 1) / 2.6;
  return p < 0.18
    ? "space"
    : p < 0.38
      ? "life"
      : p < 0.58
        ? "matter"
        : p < 0.79
          ? "machine"
          : p < 0.87
            ? "connected"
            : "fragments";
}
