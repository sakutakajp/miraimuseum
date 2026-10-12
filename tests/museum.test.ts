import { it, expect } from "vitest";
import {
  emptyCollection,
  recordNap,
  parseCollection,
  readCollection,
  saveCollection,
} from "../app/museum/collection";
import { exhibits, historicalNotes } from "../app/museum/exhibits";
it("restores one unique nap per playable exhibit without interpreting old game clears", () => {
  let c = recordNap(emptyCollection(), "sunny-room", "2026-10-11T00:00:00Z");
  c = recordNap(c, "sunny-room");
  c = recordNap(c, "forest-run");
  expect(c.naps.length).toBe(2);
  expect(c.naps[0]!.visits).toBe(2);
  expect(parseCollection(JSON.stringify(c))).toEqual(c);
  expect(recordNap(c, "clockwork")).toEqual(c);
  for (const raw of [
    null,
    "null",
    "[]",
    "broken",
    '{"version":2,"naps":[]}',
    '{"cleared":true}',
  ])
    expect(parseCollection(raw)).toEqual(emptyCollection());
  expect(
    parseCollection(
      JSON.stringify({
        version: 1,
        naps: [
          { id: "sunny-room", completedAt: "invalid", visits: 1 },
          { id: "future", completedAt: new Date().toISOString(), visits: 1 },
        ],
      }),
    ),
  ).toEqual(emptyCollection());
});
it("continues without storage and marks future exhibits as unavailable", () => {
  const storage = {
    getItem() {
      throw new Error("blocked");
    },
    setItem() {
      throw new Error("blocked");
    },
  };
  expect(readCollection(storage)).toEqual(emptyCollection());
  expect(saveCollection(storage, emptyCollection())).toBe(false);
  for (const e of exhibits) expect(!!e.route).toBe(e.available);
  expect(exhibits.find((e) => e.id === "forest-run")!.name).toContain(
    "時空ねこ",
  );
  for (const note of Object.values(historicalNotes)) {
    expect(note.place).not.toBe("");
    expect(note.sources.length).toBeGreaterThan(1);
    expect(note.invention).toContain("ゲーム");
    expect(note.estimate).not.toBe("");
  }
});
