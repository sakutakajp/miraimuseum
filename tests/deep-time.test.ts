import { describe, expect, it } from "vitest";
import {
  FixedStepWorld,
  intersectsObstacle,
} from "../app/game/dinosaur/systems/FixedStepWorld";
import { StageClock } from "../app/game/dinosaur/systems/StageClock";
import { TriggerSystem } from "../app/game/dinosaur/systems/TriggerSystem";
import {
  ScoreSystem,
  accuracy,
  rankFor,
} from "../app/game/dinosaur/systems/ScoreSystem";
import { LevelRuntime } from "../app/game/dinosaur/systems/LevelRuntime";
import { STAGE_01 } from "../app/game/dinosaur/levels/stage01";
import {
  DURATION,
  FIXED_DT,
  speedAt,
} from "../app/game/dinosaur/config/gameplay";
import type { Level } from "../app/game/dinosaur/types";
const empty: Level = {
  id: "test",
  speeds: STAGE_01.speeds,
  sections: STAGE_01.sections,
  obstacles: [],
  terrain: [],
  challenges: [],
  cues: [],
};
function run(deltas: number[]) {
  const w = new FixedStepWorld(STAGE_01);
  for (const c of STAGE_01.challenges) w.queueJump(c.at);
  let i = 0;
  while (w.state.alive && w.clock.elapsedSeconds < DURATION - 1e-9 && i < 25000)
    w.advance(deltas[i++ % deltas.length]!);
  return w;
}
describe("DEEP TIME deterministic authored run", () => {
  it("clears all fifty challenges without assistance at 60, 120 and irregular render rates", () => {
    const a = run([1 / 60]),
      b = run([1 / 120]),
      c = run([0.003, 0.042, 0.009, 0.11, 0.017]);
    expect(a.state.alive, `death at ${a.clock.elapsedSeconds}`).toBe(true);
    expect(a.clock.ticks).toBe(18432);
    expect(b.state).toEqual(a.state);
    expect(c.state).toEqual(a.state);
  });
  it("preserves all ticks through a large render delta and drains bounded work", () => {
    const a = new FixedStepWorld(empty),
      b = new FixedStepWorld(empty);
    a.queueJump(0.3);
    b.queueJump(0.3);
    for (let i = 0; i < 60; i++) a.advance(1 / 60);
    b.advance(1);
    for (let i = 0; i < 4; i++) b.advance(0);
    expect(b.state).toEqual(a.state);
  });
  it("dies on the first obstacle and resets without rewind or immunity", () => {
    const r = new LevelRuntime(STAGE_01);
    while (r.world.state.alive) r.advance(1 / 60);
    expect(r.world.clock.elapsedSeconds).toBeLessThan(2);
    const x = r.world.state.worldX;
    r.advance(1);
    expect(r.world.state.worldX).toBe(x);
    r.reset();
    expect(r.world.state).toMatchObject({
      worldX: 0,
      alive: true,
      grounded: true,
      elapsedFixedSteps: 0,
    });
  });
});
describe("DEEP TIME jump feel and fair collisions", () => {
  it("never double jumps; an early landing input is buffered", () => {
    const w = new FixedStepWorld(empty);
    let jumps = 0;
    w.onJump = () => jumps++;
    w.queueJump(0);
    w.queueJump(0.2);
    w.queueJump(0.62);
    w.advance(0.25);
    w.advance(0.25);
    w.advance(0.25);
    expect(jumps).toBe(2);
    expect(w.state.playerVelocityY).toBeLessThan(0);
  });
  it("allows a jump within 70ms of a ledge but rejects it after that window", () => {
    const level = {
      ...empty,
      terrain: [{ id: "gap", start: 1, end: 1000, y: 0, gap: true }],
    };
    const a = new FixedStepWorld(level),
      b = new FixedStepWorld(level);
    a.queueJump(0.04);
    b.queueJump(0.09);
    a.advance(0.1);
    b.advance(0.1);
    expect(a.state.playerVelocityY).toBeLessThan(0);
    expect(b.state.playerVelocityY).toBeGreaterThan(0);
  });
  it("does not collide with the decorative edge or rock tips", () => {
    const o = {
      id: "rock",
      x: 100,
      width: 40,
      height: 40,
      kind: "rock" as const,
    };
    expect(intersectsObstacle(100, -36, o, 0)).toBe(false);
    expect(intersectsObstacle(100, -34, o, 0)).toBe(true);
    expect(intersectsObstacle(70, 0, o, 0)).toBe(false);
    expect(intersectsObstacle(76, 0, o, 0)).toBe(true);
  });
});
describe("DEEP TIME clocks, cues and scoring", () => {
  it("uses exact eight-bar section boundaries and ramps only authored speeds", () => {
    const c = new StageClock(Math.round(12.8 / FIXED_DT));
    expect(c.sectionIndex).toBe(1);
    expect(c.bar).toBe(9);
    expect(c.sectionProgress).toBeCloseTo(0);
    expect(speedAt(25.6)).toBe(240);
    expect(speedAt(38.4)).toBeCloseTo(276);
    expect(speedAt(64)).toBeCloseTo(312);
    expect(speedAt(76)).toBe(0);
  });
  it("fires crossed cues exactly once even across missed render frames and can restart", () => {
    const t = new TriggerSystem(STAGE_01.cues);
    const events: string[] = [];
    t.crossing(0, 39, (c) => events.push(c.id));
    t.crossing(38, 40, (c) => events.push(c.id));
    expect(events.filter((e) => e === "visual-impact-flash-96")).toHaveLength(
      1,
    );
    expect(new Set(events).size).toBe(events.length);
    t.reset();
    t.crossing(0, 39, (c) => events.push(c.id));
    expect(events.filter((e) => e === "visual-impact-flash-96")).toHaveLength(
      2,
    );
  });
  it("scores accuracy separately from survival, caps at 100000 and ranks clear runs", () => {
    expect(accuracy(0)).toBe(1);
    expect(accuracy(0.3)).toBe(0);
    const s = new ScoreSystem(STAGE_01.challenges);
    for (const c of STAGE_01.challenges) {
      s.jump(c.at);
      s.jump(c.at);
    }
    expect(s.result(7)).toMatchObject({
      score: 100000,
      sync: 1,
      rank: "S",
      attempts: 7,
    });
    s.reset();
    expect(s.result(1)).toMatchObject({ score: 60000, rank: "C" });
    expect([
      rankFor(92000),
      rankFor(84000),
      rankFor(72000),
      rankFor(71999),
    ]).toEqual(["S", "A", "B", "C"]);
  });
});

import {
  emptyRecord,
  parseRecord,
  recordClear,
} from "../app/game/dinosaur/systems/records";
describe("DEEP TIME persistent records", () => {
  it("sanitizes storage, separates progress from clear score, keeps each independent best", () => {
    expect(parseRecord("{")).toEqual(emptyRecord());
    expect(
      parseRecord('{"bestProgress":100,"bestClearScore":-1,"attempts":2.8}'),
    ).toMatchObject({ bestProgress: 1, bestClearScore: 0, attempts: 2 });
    const a = recordClear(
      { ...emptyRecord(), bestProgress: 0.6, attempts: 7 },
      {
        stageId: "cretaceous-last-day",
        progress: 1,
        score: 92000,
        sync: 0.8,
        rank: "S",
        attempts: 7,
      },
    );
    const b = recordClear(a, {
      stageId: "cretaceous-last-day",
      progress: 1,
      score: 85000,
      sync: 0.9,
      rank: "A",
      attempts: 8,
    });
    expect(parseRecord(JSON.stringify(b))).toMatchObject({
      bestProgress: 1,
      bestClearScore: 92000,
      bestSync: 0.9,
      bestRank: "S",
      cleared: true,
      attempts: 7,
    });
  });
});

it("collapsing terrain changes on authored time, independent of render and quality", () => {
  const w = new FixedStepWorld(STAGE_01);
  const p = STAGE_01.terrain.find((p) => p.collapseAt !== undefined)!;
  expect(w.spatial.terrainAt(p.start + 1, p.collapseAt! - 0.001)).toBe(0);
  expect(w.spatial.terrainAt(p.start + 1, p.collapseAt!)).toBeNull();
});

it("SYNC records the accepted input time, including a buffered jump before landing", () => {
  const score = new ScoreSystem([
    { id: "one", at: 0 },
    { id: "two", at: 0.66 },
  ]);
  const w = new FixedStepWorld(empty);
  w.onJump = (_time, inputAt) => score.jump(inputAt);
  w.queueJump(0);
  w.queueJump(0.62);
  for (let i = 0; i < 3; i++) w.advance(0.25);
  expect(score.sync).toBeCloseTo((1 + accuracy(0.04)) / 2);
});
