import { describe, expect, it } from "vitest";
import {
  emptyProgress,
  parseProgress,
  recordExpedition,
} from "../app/game/progress";
import { factFor } from "../app/data/discoveries";
describe("museum persistence", () => {
  it("recovers from corrupt or unsupported saved data", () => {
    for (const data of [
      null,
      "{broken",
      '{"version":2,"visits":{"rex":5}}',
      "null",
    ])
      expect(parseProgress(data)).toEqual(emptyProgress());
  });
  it("accepts valid discoveries and drops invalid counts and unknown IDs", () => {
    expect(
      parseProgress(
        JSON.stringify({
          version: 1,
          visits: { rex: 2, fossil: -1, fern: "3", unknown: 9 },
          expeditions: 3,
          muted: true,
        }),
      ),
    ).toEqual({ version: 1, visits: { rex: 2 }, expeditions: 3, muted: true });
  });
  it("counts each discovery once per expedition and preserves previous saves", () => {
    const first = recordExpedition(emptyProgress(), ["rex", "fossil", "rex"]);
    const second = recordExpedition(first, ["rex", "fern"]);
    expect(first.visits).toEqual({ rex: 1, fossil: 1 });
    expect(second.visits).toEqual({ rex: 2, fossil: 1, fern: 1 });
    expect(second.expeditions).toBe(2);
    expect(factFor("rex", 0)).not.toBe(factFor("rex", 1));
    expect(factFor("rex", 100)).toBe(factFor("rex", 2));
  });
});
