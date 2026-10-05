import { describe, it, expect } from "vitest";
import {
  emptyGameProgress,
  parseGameProgress,
  recordGameResult,
} from "../app/games/progress";
import { Shooter } from "../app/games/shooter";
import { Expedition, STAGE_LENGTH } from "../app/game/expedition";
describe("V2 independent game progress", () => {
  it("retains best scores, clears and sequential unlocks across retries", () => {
    let p = recordGameResult(emptyGameProgress(), {
      game: "star-flight",
      stage: 1,
      score: 1500,
      cleared: true,
      health: 3,
      elapsed: 40,
    });
    p = recordGameResult(p, {
      game: "star-flight",
      stage: 1,
      score: 200,
      cleared: false,
      health: 0,
      elapsed: 10,
    });
    expect(parseGameProgress(JSON.stringify(p))["star-flight"]).toEqual({
      best: 1500,
      unlocked: 2,
      stages: { 1: { best: 1500, cleared: true } },
    });
    expect(p["dinosaur-run"].best).toBe(0);
  });
  it("recovers malformed storage and ignores invalid score values", () => {
    expect(parseGameProgress("{")).toEqual(emptyGameProgress());
    expect(
      parseGameProgress(
        '{"star-flight":{"stages":{"1":{"best":-10,"cleared":true},"9":{"best":900}}}}',
      )["star-flight"],
    ).toEqual({
      best: 0,
      unlocked: 2,
      stages: { 1: { best: 0, cleared: true } },
    });
  });
});
describe("MVP game conditions", () => {
  it("dinosaur fails at three collisions", () => {
    const e = new Expedition(1, true);
    for (let i = 0; i < 3000 && !e.finished; i++) e.update(0.05);
    expect(e.bumps).toBe(3);
    expect(e.x).toBeLessThan(STAGE_LENGTH);
  });
  it("dinosaur can clear by jumping before rocks", () => {
    const e = new Expedition(1, true);
    for (let i = 0; i < 3000 && !e.finished; i++) {
      if (e.obstacles.some((o) => o.x - e.x > 40 && o.x - e.x < 55)) e.jump();
      e.update(0.016);
    }
    expect(e.x).toBeGreaterThanOrEqual(STAGE_LENGTH);
    expect(e.bumps).toBe(0);
  });
  it("shoots enemies and rewards combos", () => {
    const s = new Shooter();
    s.targets = [{ id: 100, x: 0, y: 0, z: -2, kind: "enemy" }];
    s.update(0.05);
    expect(s.score).toBe(120);
    expect(s.combo).toBe(1);
  });
  it("fails after three damage events and clears at 40 seconds", () => {
    const s = new Shooter();
    for (let i = 0; i < 3; i++) {
      s.invulnerable = 0;
      s.targets = [{ id: 100 + i, x: 0, y: 0, z: -0.6, kind: "rock" }];
      s.update(0.05);
    }
    expect(s.shield).toBe(0);
    expect(s.finished).toBe(true);
    const clear = new Shooter();
    clear.elapsed = 39.98;
    clear.update(0.05);
    expect(clear.finished).toBe(true);
    expect(clear.shield).toBe(3);
    expect(clear.score).toBeGreaterThan(1500);
  });
});
