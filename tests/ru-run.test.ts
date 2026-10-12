import { it, expect } from "vitest";
import {
  newRun,
  stepRun,
  jumpRun,
  resumeRun,
  RunClock,
} from "../app/games/ru-run/physics";
import { RUN_END, runObstacles } from "../app/games/ru-run/level";
it("clears the complete authored course at both speeds using real jump and collision logic", () => {
  for (const slow of [false, true]) {
    let s = resumeRun(newRun(slow));
    for (let i = 0; i < 8000 && s.mode === "running"; i++) {
      const obstacle = runObstacles.find((o) => o.x > s.x - 20);
      if (s.y === 0 && obstacle && obstacle.x - s.x < 55) s = jumpRun(s);
      s = stepRun(s);
    }
    expect(s.mode).toBe("complete");
    expect(s.x).toBe(RUN_END);
    expect(s.passed).toBe(9);
    expect(s.stumbles).toBe(0);
    expect(stepRun(s)).toBe(s);
    expect(jumpRun(s)).toBe(s);
  }
});
it("retries near the last safe obstacle and never permits jumping in the air", () => {
  let s = resumeRun(newRun());
  s = jumpRun(s);
  s = stepRun(s);
  expect(jumpRun(s)).toBe(s);
  while (s.mode === "running") s = stepRun(s);
  expect(s.mode).toBe("stumble");
  expect(s.stumbles).toBe(1);
  expect(resumeRun(s).x).toBe(0);
  s = resumeRun({ ...s, checkpoint: 360, x: 490 });
  expect(s.x).toBe(360);
  expect(s.y).toBe(0);
  expect(s.velocity).toBe(0);
});
it("has deterministic fixed ticks, pauses cleanly and discards suspension time", () => {
  const a = new RunClock(),
    b = new RunClock();
  let first = resumeRun(newRun()),
    second = resumeRun(newRun());
  for (let i = 0; i < 30; i++) first = a.advance(first, 1 / 30);
  for (let i = 0; i < 120; i++) second = b.advance(second, 1 / 120);
  expect(first).toEqual(second);
  const paused = { ...first, mode: "paused" as const };
  expect(a.advance(paused, 100)).toBe(paused);
  expect(a.advance(resumeRun(paused), 100).x - first.x).toBeLessThanOrEqual(
    12.1,
  );
  expect(a.advance(first, NaN)).toBe(first);
});
