import { describe, expect, it } from "vitest";
import { createCybertruckUnlock } from "../app/experiences/floating-earth/cybertruck-unlock";
import { DEEP_TIME_SAVE_KEY, emptyRecord } from "../app/game/dinosaur/systems/records";
import { GAME_SAVE_KEY } from "../app/games/progress";

const noRecord = () => null;
const savedClear = (key: string) => key === DEEP_TIME_SAVE_KEY
  ? JSON.stringify({ ...emptyRecord(), cleared: true, bestProgress: 1 }) : null;

describe("the Cybertruck clear reward", () => {
  it("stays locked without a clear, even when progress or the score is high", () => {
    const unlock = createCybertruckUnlock();
    expect(unlock.entry(noRecord)).toBe("locked");
    expect(unlock.entry(key => key === DEEP_TIME_SAVE_KEY
      ? JSON.stringify({ ...emptyRecord(), bestProgress: 1, bestClearScore: 100000 }) : null)).toBe("locked");
  });

  it("plays the first reveal after a real clear and does not repeat it after later clears in the same visit", () => {
    const unlock = createCybertruckUnlock();
    expect(unlock.entry(noRecord)).toBe("locked");
    unlock.cleared();
    expect(unlock.entry(noRecord)).toBe("reveal");
    unlock.appeared();
    unlock.cleared();
    expect(unlock.entry(noRecord)).toBe("visible");
    unlock.cleared();
    expect(unlock.entry(savedClear)).toBe("visible");
  });

  it("replays the introduction on a new access using the existing clear record", () => {
    const visit = createCybertruckUnlock();
    expect(visit.entry(savedClear)).toBe("reveal");
    visit.appeared();
    expect(visit.entry(savedClear)).toBe("visible");
    expect(createCybertruckUnlock().entry(savedClear)).toBe("reveal");
  });

  it("recognizes the existing general dinosaur game record independently", () => {
    const unlock = createCybertruckUnlock();
    expect(unlock.entry(key => key === GAME_SAVE_KEY ? JSON.stringify({
      "dinosaur-run": { stages: { "1": { best: 60000, cleared: true } } },
    }) : null)).toBe("reveal");
  });

  it("does not unlock for another game's record or an uncleared dinosaur stage", () => {
    const unlock = createCybertruckUnlock();
    expect(unlock.entry(key => key === GAME_SAVE_KEY ? JSON.stringify({
      "star-dive": { stages: { "1": { best: 60000, cleared: true } } },
      "dinosaur-run": { stages: { "1": { best: 60000, cleared: false } } },
    }) : null)).toBe("locked");
  });

  it("does not consume an introduction before it has appeared", () => {
    const unlock = createCybertruckUnlock();
    unlock.appeared();
    unlock.cleared();
    expect(unlock.entry(noRecord)).toBe("reveal");
    expect(unlock.entry(noRecord)).toBe("reveal");
  });

  it("ignores corrupt or unavailable storage and preserves a clear in memory", () => {
    const unlock = createCybertruckUnlock();
    expect(unlock.entry(() => "{invalid")).toBe("locked");
    const denied = () => { throw new Error("Storage unavailable"); };
    expect(unlock.entry(denied)).toBe("locked");
    unlock.cleared();
    expect(unlock.entry(denied)).toBe("reveal");
    unlock.appeared();
    expect(unlock.entry(denied)).toBe("visible");
  });
});
