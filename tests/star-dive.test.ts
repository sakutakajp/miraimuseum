import { describe, it, expect, vi, afterEach } from "vitest";
import { StageClock } from "../app/games/star-dive/StageClock";
import { ScoreSystem } from "../app/games/star-dive/gameplay/ScoreSystem";
import { PlayerController } from "../app/games/star-dive/player";
import { InputController } from "../app/games/star-dive/input/InputController";
import { StarDiveRuntime } from "../app/games/star-dive/StarDiveRuntime";
import {
  sections,
  sectionAt,
  type Entity,
} from "../app/games/star-dive/config";
import { PerformanceManager } from "../app/games/star-dive/performance/PerformanceManager";
import { selectBackend } from "../app/games/star-dive/visual/renderer";
import {
  emptyGameProgress,
  recordGameResult,
  parseGameProgress,
} from "../app/games/progress";

function simulation() {
  let now = 0;
  const clock = new StageClock(() => now),
    runtime = new StarDiveRuntime(clock);
  clock.start();
  return {
    runtime,
    advance: (seconds: number, step = 1 / 60) => {
      const end = now + seconds;
      while (now < end - 1e-8) {
        const dt = Math.min(step, end - now);
        now += dt;
        runtime.update(dt);
      }
    },
  };
}
function hazard(runtime: StarDiveRuntime, x: number, id = 999): Entity {
  return {
    id,
    kind: "asteroid",
    x,
    y: 0,
    z: -1,
    born: runtime.clock.time - 44 / 14,
    hp: 1,
    radius: 0.5,
    nearRadius: 1.25,
    minDistance: Infinity,
    touched: false,
    passed: false,
  };
}
describe("STAR DIVE audio-clock timeline", () => {
  it("covers six eight-bar sections in 80 seconds at 144 BPM", () => {
    let now = 0;
    const clock = new StageClock(() => now);
    clock.start();
    for (let i = 0; i < 6; i++) {
      now = (i * 80) / 6 + 0.001;
      expect(sectionAt(clock.time)).toBe(sections[i]);
      expect(clock.bar).toBe(i * 8 + 1);
    }
    now = 80;
    expect(clock.beat).toBe(192);
    expect(clock.sixteenth).toBe(768);
    expect(sectionAt(100)).toBe("break-out");
  });
  it("pauses, swaps audio sources and changes debug speed without jumps", () => {
    let wall = 0,
      audio = 100;
    const clock = new StageClock(() => wall);
    clock.start();
    wall = 5;
    clock.pause();
    wall = 50;
    expect(clock.time).toBe(5);
    clock.useSource(() => audio);
    clock.resume();
    audio += 2;
    expect(clock.time).toBe(7);
    clock.setScale(0.5);
    audio += 4;
    expect(clock.time).toBe(9);
  });
  it("does not spawn targets or hazards during the launch", () => {
    const s = simulation();
    s.advance(13.3);
    expect(s.runtime.entities).toHaveLength(0);
    expect(s.runtime.player.shield).toBe(3);
  });
});
describe("score, chain, risk and shields", () => {
  it("uses the capped chain multiplier, target base values, and risk", () => {
    const score = new ScoreSystem();
    expect(score.destroy("shard", 0)).toBe(105);
    expect(score.destroy("core", 0.5)).toBe(330);
    score.recordNear();
    expect(score.destroy("gate", 1)).toBe(863);
    for (let i = 0; i < 30; i++) score.destroy("shard", 1);
    expect(score.destroy("shard", 1)).toBe(300);
    expect(score.maxChain).toBe(34);
  });
  it("expires chains after 1.5 seconds and resets risk after damage", () => {
    const score = new ScoreSystem();
    score.destroy("shard", 2);
    score.update(3.5);
    expect(score.chain).toBe(1);
    score.update(3.501);
    expect(score.chain).toBe(0);
    for (let i = 0; i < 8; i++) score.recordNear();
    expect(score.risk).toBe(3);
    score.damage();
    expect(score.risk).toBe(1);
    expect(score.chain).toBe(0);
    score.recordNear();
    expect(score.risk).toBe(1.5);
    expect(score.nearCount).toBe(9);
  });
  it("applies three shields and 1.2 seconds of invulnerability", () => {
    const player = new PlayerController();
    expect(player.damage()).toBe(true);
    expect(player.damage()).toBe(false);
    expect(player.shield).toBe(2);
    player.update(1.21);
    expect(player.damage()).toBe(true);
    player.update(1.21);
    expect(player.damage()).toBe(true);
    expect(player.shield).toBe(0);
    expect(player.damage()).toBe(false);
  });
  it("awards NEAR exactly once after passing, including a dropped frame", () => {
    const s = simulation();
    s.runtime.entities.push(hazard(s.runtime, 1));
    s.advance(0.25, 0.25);
    expect(s.runtime.score.nearCount).toBe(1);
    expect(s.runtime.score.risk).toBe(1.5);
    s.advance(0.3);
    expect(s.runtime.score.nearCount).toBe(1);
    expect(s.runtime.player.shield).toBe(3);
  });
  it("never awards NEAR to a collision, even during invulnerability", () => {
    const s = simulation();
    s.runtime.entities.push(hazard(s.runtime, 0));
    s.advance(0.25, 0.25);
    expect(s.runtime.player.shield).toBe(2);
    expect(s.runtime.score.nearCount).toBe(0);
    s.runtime.entities.push(hazard(s.runtime, 0, 1000));
    s.advance(0.25, 0.25);
    expect(s.runtime.player.shield).toBe(2);
    expect(s.runtime.score.nearCount).toBe(0);
  });
  it("auto-fires without input, with at most three simultaneous targets", () => {
    const s = simulation();
    for (let i = 0; i < 40 * 60; i++) {
      s.advance(1 / 60);
      expect(
        s.runtime.entities.filter((e) => e.kind !== "asteroid").length,
      ).toBeLessThanOrEqual(3);
    }
    expect(s.runtime.score.score).toBeGreaterThan(300);
    expect(s.runtime.score.maxChain).toBeGreaterThanOrEqual(3);
  });
  it("opens a missed gate, clears at 80 seconds and awards shield bonus once", () => {
    const s = simulation();
    s.runtime.player.target(3, 2);
    s.advance(57.4);
    expect(s.runtime.gateOpen).toBe(true);
    expect(s.runtime.gateKills).toBe(0);
    const before = s.runtime.score.score;
    s.advance(22.7);
    expect(s.runtime.finished).toBe(true);
    expect(s.runtime.cleared).toBe(true);
    expect(s.runtime.player.shield).toBe(3);
    expect(s.runtime.score.score).toBe(before + 6000);
    s.advance(2);
    expect(s.runtime.score.score).toBe(before + 6000);
  });
  it("ends immediately when the last shield is lost", () => {
    const s = simulation();
    s.runtime.player.shield = 1;
    s.runtime.entities.push(hazard(s.runtime, 0));
    s.advance(0.1);
    expect(s.runtime.finished).toBe(true);
    expect(s.runtime.cleared).toBe(false);
    expect(s.runtime.score.score).toBe(0);
  });
});
describe("relative drag and adaptive quality", () => {
  it("anchors on the ship, ignores a second finger and retains the final target", () => {
    const player = new PlayerController();
    player.x = 1;
    player.y = 0.5;
    player.targetX = 2;
    const input = new InputController(player),
      pointer = (x: number, id = 1) =>
        ({ clientX: x, clientY: 200, pointerId: id }) as PointerEvent;
    input.down(pointer(300));
    expect(player.targetX).toBe(1);
    input.down(pointer(0, 2));
    input.move(pointer(350), { width: 300, height: 600 } as DOMRect);
    expect(player.targetX).toBe(2);
    input.up(pointer(350));
    input.move(pointer(0), { width: 300, height: 600 } as DOMRect);
    expect(player.targetX).toBe(2);
    player.update(0.05);
    expect(player.x).toBeGreaterThan(1);
    expect(player.x).toBeLessThan(2);
  });
  it("drops quality only after sustained load and honors forced debug quality", () => {
    const manager = new PerformanceManager("high");
    for (let i = 0; i < 220; i++) manager.update(0.05);
    expect(manager.quality).toBe("low");
    manager.force("high");
    for (let i = 0; i < 220; i++) manager.update(0.05);
    expect(manager.quality).toBe("high");
  });
});
describe("clear-only storage and backend fallback", () => {
  afterEach(() => vi.unstubAllGlobals());
  it("never changes BEST, unlocks or discoveries after failure", () => {
    const base = {
      game: "star-flight" as const,
      stage: 1,
      score: 100,
      health: 3,
      elapsed: 80,
      cleared: true,
    };
    const saved = recordGameResult(emptyGameProgress(), base);
    expect(
      recordGameResult(saved, {
        ...base,
        score: 900000,
        cleared: false,
        health: 0,
      }),
    ).toEqual(saved);
    expect(
      recordGameResult(emptyGameProgress(), {
        ...base,
        score: 900000,
        cleared: false,
      })["star-flight"].best,
    ).toBe(0);
    expect(
      parseGameProgress(JSON.stringify(saved))["star-flight"],
    ).toMatchObject({ best: 100, unlocked: 2, discoveries: ["asteroid"] });
  });
  it("prefers an available GPU adapter and falls back when acquisition fails", async () => {
    vi.stubGlobal("navigator", { gpu: {} });
    expect(
      await selectBackend({ webGPU: async () => "gpu", webGL2: () => "gl" }),
    ).toBe("gpu");
    expect(
      await selectBackend({
        webGPU: async () => {
          throw Error("adapter");
        },
        webGL2: () => "gl",
      }),
    ).toBe("gl");
    expect(
      await selectBackend({
        forceWebGL2: true,
        webGPU: async () => "gpu",
        webGL2: () => "gl",
      }),
    ).toBe("gl");
  });
});
