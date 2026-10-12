import { describe, it, expect } from "vitest";
import { KANA, shiftWord } from "../app/games/caesar/cipher";
import { practices, sunnyQuestions } from "../app/games/caesar/sunny-questions";
import {
  newSunnyState,
  sunnyTransition as move,
  canSubmit,
  practiceWord,
  type SunnyState,
} from "../app/games/caesar/sunny-state";
import {
  emptySunnyProgress,
  parseSunnyProgress,
  readSunnyProgress,
  saveSunnyProgress,
} from "../app/games/caesar/sunny-progress";
const ready = (s: SunnyState) => move(s, { type: "ready" });
const next = (s: SunnyState) =>
  ready(move(move(s, { type: "settle" }), { type: "next" }));
function quiz() {
  let s = next(next(ready(newSunnyState())));
  for (const p of practices)
    s = next(move(s, { type: "shift", amount: p.shift }));
  s = next(move(s, { type: "shift", amount: 1 }));
  s = next(move(s, { type: "shift", amount: -1 }));
  s = move(s, { type: "shift", amount: 1 });
  return next(move(s, { type: "shift", amount: 1 }));
}
const predict = (s: SunnyState, letter: string) =>
  move(move(s, { type: "predict", letter }), { type: "submit" });
function solve(s: SunnyState, amount: number, direction: "back" | "forward") {
  s = move(s, { type: "direction", direction });
  s = move(s, { type: "amount", amount });
  s = move(s, { type: "control-next" });
  return move(s, { type: "submit" });
}
describe("Ru's learning flow", () => {
  it("verifies every adopted word through the real shared cipher", () => {
    for (const q of [...practices, ...sunnyQuestions])
      expect(shiftWord(q.input, q.shift)).toBe(q.expected);
    for (const letter of KANA)
      expect(shiftWord(shiftWord(letter, 3), -3)).toBe(letter);
    expect(shiftWord("ん", 1)).toBe("あ");
    expect(shiftWord("あ", -1)).toBe("ん");
  });
  it("connects a short motivation to one guided action, not an immediate quiz", () => {
    let s = newSunnyState();
    expect(move(s, { type: "next" })).toBe(s);
    s = move(ready(s), { type: "next" });
    expect(s.view).toBe("intro");
    expect(s.index).toBe(1);
    expect(move(s, { type: "next" })).toBe(s);
    s = next(ready(s));
    expect(s.view).toBe("practice");
    expect(practiceWord(s)).toBe("い");
    expect(move(s, { type: "shift", amount: 1 })).toBe(s);
    s = move(s, { type: "shift", amount: -1 });
    expect(practiceWord(s)).toBe("あ");
    expect(s.phase).toBe("celebrating");
    expect(move(s, { type: "next" })).toBe(s);
    expect(move(s, { type: "shift", amount: -1 })).toBe(s);
  });
  it("counts movements from zero and excludes all guided practices from assessment", () => {
    const s = quiz();
    expect(s.view).toBe("quiz");
    expect(s.index).toBe(0);
    expect(s.progress).toEqual(emptySunnyProgress());
    let key = ready({ ...s, view: "key" as const, shift: 0 });
    expect(key.shift).toBe(0);
    key = move(key, { type: "shift", amount: 1 });
    expect(key.shift).toBe(1);
    expect(key.correct).toBeNull();
    key = move(key, { type: "shift", amount: 1 });
    expect(key.shift).toBe(2);
    expect(key.correct).toBe(true);
  });
  it("requires a prediction before revealing or moving the board", () => {
    let s = quiz();
    expect(canSubmit(s)).toBe(false);
    expect(s.result).toBeNull();
    expect(move(s, { type: "shift", amount: 2 })).toBe(s);
    expect(move(s, { type: "direction", direction: "forward" })).toBe(s);
    s = move(s, { type: "predict", letter: "く" });
    expect(s.result).toBeNull();
    expect(canSubmit(s)).toBe(true);
    s = move(s, { type: "submit" });
    expect(s.result).toBe("く");
    expect(s.correct).toBe(true);
    expect(move(s, { type: "submit" })).toBe(s);
    expect(s.progress.records["predict-two"]!.attempts).toBe(1);
  });
  it("retries a wrong prediction in place and remembers first result and hint use", () => {
    let s = predict(quiz(), "き");
    expect(s.correct).toBe(false);
    expect(s.view).toBe("quiz");
    s = move(s, { type: "hint" });
    s = predict(s, "く");
    expect(s.progress.records["predict-two"]).toEqual({
      attempts: 2,
      firstCorrect: false,
      hints: 1,
      solved: true,
    });
  });
  it("keeps direction and amount when going back and hides results during configuration", () => {
    let s = next(predict(quiz(), "く"));
    expect(s.direction).toBeNull();
    expect(s.amount).toBe(0);
    s = move(s, { type: "direction", direction: "back" });
    expect(s.control).toBe("number");
    s = move(s, { type: "amount", amount: 2 });
    s = move(s, { type: "control-next" });
    expect(s.result).toBeNull();
    s = move(s, { type: "control-back" });
    s = move(s, { type: "control-back" });
    expect(s.control).toBe("direction");
    expect(s.amount).toBe(2);
    expect(s.direction).toBe("back");
    s = solve(s, 1, "back");
    expect(s.correct).toBe(false);
    expect(s.result).toBe("ふれ");
    s = move(s, { type: "control-back" });
    expect(s.result).toBeNull();
    s = solve(s, 2, "back");
    expect(s.result).toBe("ひる");
    expect(s.correct).toBe(true);
  });
  it("accepts equivalent shifts and changes the key for the final door", () => {
    let s = next(predict(quiz(), "く"));
    s = next(solve(s, 44, "forward"));
    expect(s.index).toBe(2);
    expect(sunnyQuestions[s.index]!.clue.changed).toBe("え");
    const wrong = solve(s, 2, "back");
    expect(wrong.correct).toBe(false);
    s = solve(wrong, 43, "forward");
    expect(s.correct).toBe(true);
    expect(s.result).toBe("おうち");
    s = next(s);
    expect(s.view).toBe("nap");
    expect(s.progress.cleared).toBe(true);
    expect(parseSunnyProgress(JSON.stringify(s.progress))).toEqual(s.progress);
  });
  it("wraps number adjustments and rejects unsupported values without corrupting state", () => {
    let s = next(predict(quiz(), "く"));
    s = move(s, { type: "amount", amount: -1 });
    expect(s.amount).toBe(45);
    s = move(s, { type: "amount", amount: 46 });
    expect(s.amount).toBe(0);
    expect(move(s, { type: "amount", amount: NaN })).toBe(s);
    expect(move(s, { type: "amount", amount: 0.5 })).toBe(s);
  });
  it("never reinterprets old curricula, forged clears or damaged saves", () => {
    for (const raw of [
      null,
      "broken",
      "[]",
      JSON.stringify({ version: 2, curriculum: "mii-home-1", cleared: true }),
      JSON.stringify({ ...emptySunnyProgress(), cleared: true }),
    ])
      expect(parseSunnyProgress(raw)).toEqual(emptySunnyProgress());
    const p = emptySunnyProgress();
    (p.records as any)["predict-two"] = {
      attempts: -1,
      hints: 99,
      firstCorrect: true,
      solved: true,
    };
    expect(parseSunnyProgress(JSON.stringify(p))).toEqual(emptySunnyProgress());
    const blocked = {
      getItem() {
        throw new Error("blocked");
      },
      setItem() {
        throw new Error("blocked");
      },
    };
    expect(readSunnyProgress(blocked)).toEqual(emptySunnyProgress());
    expect(saveSunnyProgress(blocked, p)).toBe(false);
  });
});
