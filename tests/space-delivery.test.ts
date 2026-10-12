import { describe, expect, it } from "vitest";
import {
  acceleration,
  advanceFrame,
  circleEntry,
  DT,
  launch,
  predict,
  step,
} from "../app/game/space-delivery/physics";
import { stages } from "../app/game/space-delivery/stages";
import type { Stage } from "../app/game/space-delivery/types";
import {
  emptyProgress,
  parseProgress,
  recordDelivery,
} from "../app/game/space-delivery/progress";
import { DeliveryRuntime } from "../app/game/space-delivery/runtime";
import { clampDrag, shotFromDrag } from "../app/game/space-delivery/input";
const free: Stage = {
  ...stages[0]!,
  board: { width: 100000, height: 100000 },
  launch: { x: 500, y: 500 },
  planets: [],
  obstacles: [],
  stars: [],
  destination: { x: 9000, y: 9000, radius: 1 },
  maxTime: 20,
};
describe("space delivery deterministic physics", () => {
  it("moves uniformly without gravity and attracts toward a planet", () => {
    let state = launch(free, { angle: 90, speed: 100 });
    for (let i = 0; i < 120; i++) state = step(free, state).state;
    expect(state.position.x).toBeCloseTo(600, 8);
    expect(state.position.y).toBeCloseTo(500, 8);
    expect(state.velocity.x).toBeCloseTo(100, 8);
    const stage = {
      ...free,
      planets: [{ x: 600, y: 500, radius: 30, mu: 100000, color: 0 }],
    };
    expect(acceleration(state.position, stage).x).toBeCloseTo(0);
    const initial = launch(stage, { angle: 0, speed: 0 });
    expect(acceleration(initial.position, stage).x).toBeGreaterThan(0);
    expect(step(stage, initial).state.velocity.x).toBeGreaterThan(0);
  });
  it("uses the identical fixed step in prediction and actual flight", () => {
    const s = stages[2]!,
      shot = s.references.threeStars,
      preview = predict(s, shot, 2);
    let state = launch(s, shot);
    for (let i = 0; i < 240; i++) state = step(s, state).state;
    expect(preview.state).toEqual(state);
    expect(predict(s, shot, 2)).toEqual(preview);
  });
  it("is independent of 30/60/120fps and caps stalled frames", () => {
    const s = stages[4]!,
      shot = s.references.delivery;
    const results = [30, 60, 120].map((fps) => {
      let state = launch(s, shot),
        acc = 0;
      for (let i = 0; i < fps * 3; i++) {
        const r = advanceFrame(s, state, acc, 1 / fps);
        state = r.state;
        acc = r.accumulator;
      }
      return state;
    });
    expect(results[0]).toEqual(results[1]);
    expect(results[1]).toEqual(results[2]);
    expect(
      advanceFrame(s, launch(s, shot), 0, 10).state.time,
    ).toBeLessThanOrEqual(0.1 + 1e-10);
  });
  it("sweeps fast movement and processes competing events in physical order", () => {
    const initial = launch(free, { angle: 90, speed: 120000 });
    const destination = { x: 800, y: 500, radius: 10 },
      obstacle = { x: 1000, y: 500, radius: 20 };
    const first = {
      ...free,
      destination,
      obstacles: [obstacle],
      stars: [
        { x: 700, y: 500, radius: 10 },
        { x: 1200, y: 500, radius: 10 },
      ],
    };
    const delivered = step(first, initial);
    expect(delivered.state.outcome).toBe("success");
    expect(delivered.state.collected).toEqual([0]);
    expect(delivered.events.map((e) => e.kind)).toEqual(["star", "success"]);
    const blocked = step(
      { ...first, destination: obstacle, obstacles: [destination] },
      initial,
    );
    expect(blocked.state.outcome).toBe("failure");
    expect(blocked.state.reason).toBe("collision");
    expect(
      circleEntry({ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 5, y: 1, radius: 1 }),
    ).toBe(0.5);
  });
  it("stops at the board boundary or the flight time limit", () => {
    const outside = step(
      { ...free, board: { width: 510, height: 1000 } },
      launch(free, { angle: 90, speed: 3000 }),
    );
    expect(outside.state.reason).toBe("outside");
    expect(outside.state.position.x).toBe(510);
    const timeout = step(
      { ...free, maxTime: DT / 2 },
      launch(free, { angle: 0, speed: 0 }),
    );
    expect(timeout.state.reason).toBe("timeout");
    expect(timeout.state.time).toBe(DT / 2);
  });
  for (const stage of stages)
    it(`stage ${stage.id}: delivery and 3 stars, with ±2° / ±3% tolerance`, () => {
      expect(
        Math.hypot(
          stage.launch.x - stage.destination.x,
          stage.launch.y - stage.destination.y,
        ),
      ).toBeGreaterThan(stage.destination.radius);
      stage.planets.forEach((p) =>
        expect(
          Math.hypot(stage.launch.x - p.x, stage.launch.y - p.y),
        ).toBeGreaterThan(p.radius + 7),
      );
      stage.stars.forEach((star) =>
        stage.planets.forEach((p) =>
          expect(Math.hypot(star.x - p.x, star.y - p.y)).toBeGreaterThan(
            p.radius + star.radius + 7,
          ),
        ),
      );
      for (const kind of ["delivery", "threeStars"] as const)
        for (const angle of [-2, 0, 2])
          for (const scale of [0.97, 1, 1.03]) {
            const reference = stage.references[kind],
              result = predict(
                stage,
                {
                  angle: reference.angle + angle,
                  speed: reference.speed * scale,
                },
                stage.maxTime,
              ).state;
            expect(
              result.outcome,
              `${kind} angle ${angle} speed ${scale}`,
            ).toBe("success");
            if (kind === "threeStars") expect(result.collected.length).toBe(2);
            expect(result.time).toBeGreaterThan(3);
            expect(result.time).toBeLessThan(12);
          }
    });
  it("keeps optional stars off the broad delivery routes in stages four and six", () => {
    for (const stage of [stages[3]!, stages[5]!]) {
      expect(
        predict(stage, stage.references.delivery, stage.maxTime).state.collected
          .length,
      ).toBeLessThan(2);
      expect(
        predict(stage, stage.references.threeStars, stage.maxTime).state
          .collected.length,
      ).toBe(2);
    }
  });
  it("has an occluded third stage and visibly changing curvature in stage five", () => {
    const third = stages[2]!;
    expect(
      circleEntry(third.launch, third.destination, third.planets[0]!, 7),
    ).toBeDefined();
    const p = predict(stages[4]!, stages[4]!.references.delivery, 16).points;
    const ax = p.map((point) => acceleration(point, stages[4]!).x);
    expect(Math.max(...ax)).toBeGreaterThan(8);
    expect(Math.min(...ax)).toBeLessThan(-8);
  });
});
describe("space delivery state and storage", () => {
  it("retains aim on retry and does not launch on cancel/resume", () => {
    const game = new DeliveryRuntime(
      stages[0]!,
      () => {},
      () => {},
    );
    game.setShot({ angle: 5, speed: 90 });
    game.aim();
    game.pause();
    game.resume();
    expect(game.mode).toBe("ready");
    game.fire();
    game.tick(0.1);
    game.retry();
    expect(game.shot).toEqual({ angle: 5, speed: 90 });
    expect(game.previousTrail.length).toBeGreaterThan(1);
    expect(game.mode).toBe("ready");
  });
  it("saves successful ratings only, unlocks with one star, and recovers malformed saves", () => {
    for (const raw of [
      null,
      "{bad",
      "null",
      '{"version":2}',
      '{"version":1,"best":"oops"}',
    ])
      expect(parseProgress(raw)).toEqual(emptyProgress());
    const first = recordDelivery(emptyProgress(), 1, 0);
    expect(first.unlocked).toBe(2);
    expect(first.best[0]).toBe(1);
    expect(recordDelivery(first, 1, 2).best[0]).toBe(3);
    expect(recordDelivery(recordDelivery(first, 1, 2), 1, 0).best[0]).toBe(3);
    expect(parseProgress(JSON.stringify(first))).toEqual(first);
    expect(recordDelivery(first, 6, 2)).toEqual(first);
    expect(
      parseProgress('{"version":1,"best":[-1,99,"3",null,0,0],"unlocked":6}')
        .unlocked,
    ).toBe(1);
  });
  it("clamps the pad and cancels short gestures", () => {
    expect(
      Math.hypot(...Object.values(clampDrag({ x: 1000, y: 1000 }))),
    ).toBeCloseTo(56);
    expect(shotFromDrag({ x: 0, y: 5 }, 145)).toBeUndefined();
    expect(shotFromDrag({ x: 0, y: 56 }, 145)).toEqual({
      angle: -0,
      speed: 145,
    });
  });
});
