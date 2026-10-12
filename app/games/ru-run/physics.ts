import { RUN_DT, RUN_END, runObstacles } from "./level";
export interface RunState {
  mode: "ready" | "running" | "paused" | "stumble" | "complete";
  x: number;
  y: number;
  velocity: number;
  checkpoint: number;
  passed: number;
  stumbles: number;
  speed: number;
}
export const newRun = (slow = false): RunState => ({
  mode: "ready",
  x: 0,
  y: 0,
  velocity: 0,
  checkpoint: 0,
  passed: 0,
  stumbles: 0,
  speed: slow ? 80 : 120,
});
export function jumpRun(s: RunState): RunState {
  return s.mode === "running" && s.y === 0
    ? { ...s, velocity: (400 * s.speed) / 120 }
    : s;
}
export function resumeRun(s: RunState): RunState {
  if (s.mode === "ready" || s.mode === "paused")
    return { ...s, mode: "running" };
  if (s.mode === "stumble")
    return { ...s, mode: "running", x: s.checkpoint, y: 0, velocity: 0 };
  return s;
}
export function stepRun(s: RunState): RunState {
  if (s.mode !== "running") return s;
  const velocity = s.velocity - 900 * (s.speed / 120) ** 2 * RUN_DT;
  const y = Math.max(0, s.y + velocity * RUN_DT),
    x = s.x + s.speed * RUN_DT;
  const hit = runObstacles.find(
    (o) =>
      x + 14 > o.x - o.width / 2 &&
      x - 14 < o.x + o.width / 2 &&
      y < o.height - 3,
  );
  if (hit)
    return { ...s, x, y, velocity, mode: "stumble", stumbles: s.stumbles + 1 };
  const cleared = runObstacles.filter((o) => x > o.x + o.width / 2 + 24);
  const checkpoint = cleared.length ? cleared[cleared.length - 1]!.x + 60 : 0;
  return {
    ...s,
    x: Math.min(RUN_END, x),
    y,
    velocity: y === 0 ? 0 : velocity,
    passed: cleared.length,
    checkpoint,
    mode: x >= RUN_END ? "complete" : "running",
  };
}
/** Fixed ticks: render rate never changes collisions or jump reach. Cap backlog after suspension. */
export class RunClock {
  private accumulator = 0;
  advance(s: RunState, seconds: number): RunState {
    if (!Number.isFinite(seconds) || seconds < 0 || s.mode !== "running") {
      this.accumulator = 0;
      return s;
    }
    this.accumulator += Math.min(seconds, 0.1);
    while (this.accumulator >= RUN_DT - 1e-9 && s.mode === "running") {
      s = stepRun(s);
      this.accumulator -= RUN_DT;
    }
    if (s.mode !== "running") this.accumulator = 0;
    return s;
  }
  reset() {
    this.accumulator = 0;
  }
}
