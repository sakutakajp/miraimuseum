import { describe, expect, it } from "vitest";
import {
  Expedition,
  STAGE_LENGTH,
  obstacles,
  collectibles,
  levelSettings,
  unlockedLevel,
} from "../app/game/expedition";
import { discoveriesFor } from "../app/data/discoveries";
function play(jumping: boolean, level = 1) {
  const run = new Expedition(level);
  const targets = [
    ...run.obstacles.map((item) => ({ x: item.x, lead: 60 })),
    ...collectibles
      .filter((item) => item.elevated)
      .map((item) => ({ x: item.x, lead: 85 })),
  ].sort((a, b) => a.x - b.x);
  const jumped = new Set<number>();
  for (let frame = 0; frame < 60 * 180 && !run.finished; frame++) {
    for (const target of targets) {
      if (jumping && !jumped.has(target.x) && run.x >= target.x - target.lead) {
        run.jump();
        jumped.add(target.x);
      }
    }
    run.update(1 / 60);
  }
  return run;
}
describe("a complete dinosaur expedition", () => {
  it.each([1, 2, 3])("level %i reaches the goal and all six discoveries with timed jumps", (level) => {
    const run = play(true, level);
    expect(run.finished).toBe(true);
    expect(run.x).toBeGreaterThanOrEqual(STAGE_LENGTH);
    expect(run.bumps).toBe(0);
    expect([...run.found].sort()).toEqual(
      discoveriesFor("dinosaur")
        .map((item) => item.id)
        .sort(),
    );
  });
  it.each([1, 2, 3])("level %i helps a player who never jumps finish, while leaving elevated discoveries for replay", (level) => {
    const run = play(false, level);
    expect(run.finished).toBe(true);
    expect(run.bumps).toBeGreaterThan(0);
    expect([...run.found]).toEqual(["strata", "fossil", "fern", "rex"]);
  });
  it("shortens a clean run to 45–55 seconds including the ending", () => {
    for (const level of [1, 2, 3]) {
      const run = new Expedition(level);
      const duration = STAGE_LENGTH / run.settings.speed + 8.9;
      expect(duration).toBeGreaterThanOrEqual(44);
      expect(duration).toBeLessThanOrEqual(55);
    }
    expect(levelSettings(3).speed).toBeGreaterThan(levelSettings(1).speed);
    expect(new Expedition(3).obstacles[0]!.height).toBeGreaterThan(obstacles[0]!.height);
  });
  it("unlocks levels using completed expeditions and caps the difficulty", () => {
    expect([0, 1, 2, 999].map(unlockedLevel)).toEqual([1, 2, 3, 3]);
    expect(levelSettings(-1).level).toBe(1);
    expect(levelSettings(Infinity).level).toBe(1);
    expect(levelSettings(999).level).toBe(3);
  });
  it("does not allow a second jump in midair", () => {
    const run = new Expedition();
    expect(run.jump()).toBe(true);
    run.update(0.1);
    const velocity = run.velocity;
    expect(run.jump()).toBe(false);
    expect(run.velocity).toBe(velocity);
  });
});
