export const FIXED_DT = 1 / 240;
export const BPM = 150;
export const BEAT_SECONDS = 60 / BPM;
export const SECTION_SECONDS = 12.8;
export const DURATION = 76.8;
export const RUN_SPEED = 240;
export const GRAVITY = 1850;
export const JUMP_VELOCITY = -620;
export const COYOTE_SECONDS = 0.07;
export const BUFFER_SECONDS = 0.1;
export const PLAYER_WIDTH = 28;
export const PLAYER_HEIGHT = 54;
export const COLLISION_WIDTH = PLAYER_WIDTH * 0.76;
export const SAFE_END = 71.2;
export const RETRY_SECONDS = 0.76;
export const MAX_SUBSTEPS = 120;
export const MAX_FRAME_DELTA = 0.25;
export const SPEED_CUES = [
  { at: 0, multiplier: 1 },
  { at: 25.6, multiplier: 1, ramp: true },
  { at: 38.4, multiplier: 1.15 },
  { at: 51.2, multiplier: 1.15, ramp: true },
  { at: 64, multiplier: 1.3 },
  { at: 71.2, multiplier: 1.3, ramp: true },
  { at: 75.2, multiplier: 0 },
] as const;
export function speedAt(
  t: number,
  cues: readonly {
    at: number;
    multiplier: number;
    ramp?: boolean;
  }[] = SPEED_CUES,
): number {
  let current = cues[0]!;
  for (let i = 1; i < cues.length; i++) {
    const next = cues[i]!;
    if (t < next.at) {
      const blend = current.ramp
        ? (t - current.at) / (next.at - current.at)
        : 0;
      return (
        RUN_SPEED *
        (current.multiplier + (next.multiplier - current.multiplier) * blend)
      );
    }
    current = next;
  }
  return RUN_SPEED * current.multiplier;
}
// Geometry is authored against precisely the same tick integration as the world.
const distances = new Float64Array(Math.round(DURATION / FIXED_DT) + 1);
for (let tick = 1; tick < distances.length; tick++)
  distances[tick] =
    distances[tick - 1]! + speedAt((tick - 1) * FIXED_DT) * FIXED_DT;
export function distanceAt(t: number): number {
  return distances[
    Math.min(distances.length - 1, Math.max(0, Math.round(t / FIXED_DT)))
  ]!;
}
