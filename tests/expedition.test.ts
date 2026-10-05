import { describe, expect, it } from "vitest";
import {
  Expedition,
  STAGE_LENGTH,
  obstacles,
  collectibles,
} from "../app/game/expedition";
import { discoveriesFor } from "../app/data/discoveries";
function play(jumping: boolean) {
  const run = new Expedition();
  const targets = [
    ...obstacles.map((item) => ({ x: item.x, lead: 60 })),
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
  it("reaches the goal and all six discoveries with timed jumps", () => {
    const run = play(true);
    expect(run.finished).toBe(true);
    expect(run.x).toBeGreaterThanOrEqual(STAGE_LENGTH);
    expect(run.bumps).toBe(0);
    expect([...run.found].sort()).toEqual(
      discoveriesFor("dinosaur")
        .map((item) => item.id)
        .sort(),
    );
  });
  it("helps a player who never jumps finish, while leaving elevated discoveries for replay", () => {
    const run = play(false);
    expect(run.finished).toBe(true);
    expect(run.bumps).toBeGreaterThan(0);
    expect([...run.found]).toEqual(["strata", "fossil", "fern", "rex"]);
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
