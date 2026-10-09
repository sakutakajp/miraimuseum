import { describe, expect, it } from "vitest";
import {
  Voyage,
  voyageObstacles,
  voyagePhaseAt,
  VOYAGE_LENGTH,
  type VoyageWorld,
} from "../app/game/voyage";
import { discoveries, discoveriesFor } from "../app/data/discoveries";
import { sprites, palette } from "../app/data/sprites";

function play(world: VoyageWorld, boosting: boolean) {
  const run = new Voyage(world);
  const targets = [
    ...voyageObstacles
      .filter((item) => item.y === 0)
      .map((item) => ({ x: item.x, lead: 80 })),
    ...run.collectibles
      .filter((item) => item.elevated)
      .map((item) => ({ x: item.x, lead: 85 })),
  ];
  const acted = new Set<number>();
  for (let frame = 0; frame < 60 * 180 && !run.finished; frame++) {
    for (const target of targets) {
      if (boosting && !acted.has(target.x) && run.x >= target.x - target.lead) {
        run.boost();
        acted.add(target.x);
      }
    }
    run.update(1 / 60);
  }
  return run;
}
for (const world of ["space", "ocean"] as const) {
  describe(world + " expedition", () => {
    it("finishes and collects all six discoveries with actual timed inputs", () => {
      const run = play(world, true);
      expect(run.finished).toBe(true);
      expect(run.bumps).toBe(0);
      expect([...run.found].sort()).toEqual(
        discoveriesFor(world)
          .map((item) => item.id)
          .sort(),
      );
      expect(voyagePhaseAt(run.x)).toBe("ending");
    });
    it("allows a player who never taps to finish with the four accessible discoveries", () => {
      const run = play(world, false);
      expect(run.finished).toBe(true);
      expect(run.bumps).toBeGreaterThan(0);
      expect([...run.found]).toEqual(
        run.collectibles
          .filter((item) => !item.elevated)
          .map((item) => item.id),
      );
    });
    it("allows boosting again in midair and keeps repeated input within the visible route", () => {
      const run = new Voyage(world);
      run.boost();
      run.update(0.1);
      expect(run.y).toBeLessThan(0);
      expect(run.boost()).toBe(true);
      for (let i = 0; i < 1000; i++) {
        run.boost();
        run.update(1 / 60);
      }
      expect(run.y).toBeGreaterThanOrEqual(-230);
      run.x = VOYAGE_LENGTH;
      run.update(1 / 60);
      expect(run.boost()).toBe(false);
    });
  });
}
it("gives space a longer float than swimming and supplies real art for all 18 exhibits", () => {
  const space = new Voyage("space"),
    ocean = new Voyage("ocean");
  space.boost();
  ocean.boost();
  for (let i = 0; i < 40; i++) {
    space.update(1 / 60);
    ocean.update(1 / 60);
  }
  expect(space.y).toBeLessThan(ocean.y - 40);
  expect(discoveries).toHaveLength(18);
  expect(new Set(discoveries.map((item) => item.id)).size).toBe(18);
  for (const item of discoveries) {
    expect(sprites[item.sprite]?.length).toBeGreaterThan(0);
    for (const row of sprites[item.sprite]!)
      for (const pixel of row)
        if (pixel !== ".") expect(palette[pixel]).toBeDefined();
  }
});
