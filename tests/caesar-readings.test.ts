import { describe, expect, it } from "vitest";
import { copy } from "../app/games/caesar/copy";
import { readingParts } from "../app/games/caesar/readings";

function playerTexts(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (typeof value === "function") return [value(1, "す")];
  if (value && typeof value === "object") return Object.values(value).flatMap(playerTexts);
  return [];
}
describe("Caesar readings for younger children", () => {
  it("annotates every kanji in the instructions, hints, feedback and dynamic labels", () => {
    const missing = playerTexts(copy).flatMap(text => readingParts(text).filter(part => !part.reading && /[一-龯]/.test(part.text)).map(part => part.text));
    expect(missing).toEqual([]);
  });
  it("preserves letters, numbers, punctuation and the original text", () => {
    for (const text of playerTexts(copy)) expect(readingParts(text).map(part => part.text).join("")).toBe(text);
    expect(readingParts("すひす → こねこ / 3 / 46")).toEqual([{ text: "すひす → こねこ / 3 / 46" }]);
  });
  it("uses readings for whole phrases whose individual characters would be misleading", () => {
    expect(readingParts("今度は世界を探索。再表示。" )).toContainEqual({ text: "今度", reading: "こんど" });
    expect(readingParts("今度は世界を探索。再表示。" )).toContainEqual({ text: "世界", reading: "せかい" });
    expect(readingParts("今度は世界を探索。再表示。" )).toContainEqual({ text: "再表示", reading: "さいひょうじ" });
  });
});
