import { describe, expect, it } from "vitest";
import { KANA, LETTER_COUNT, shiftWord, replaceLetter } from "../app/games/caesar/cipher";
import { emptyProgress, feedback, parseProgress, readProgress, saveProgress } from "../app/games/caesar/progress";
import { bridgeWord, canExecute, createState, repairWord, transition, type GameState } from "../app/games/caesar/state";

const start = () => transition(createState(), { type: "start", stage: 2 });
function execute(state: GameState): GameState { return transition(transition(state, { type: "execute" }), { type: "resolve" }); }
function solve(state: GameState, direction: "backward" | "forward", amount: number): GameState {
  return execute(transition(transition(state, { type: "direction", direction }), { type: "amount", amount }));
}
const next = (state: GameState) => transition(transition(state, { type: "settle" }), { type: "next" });

describe("Caesar transformations", () => {
  it.each([
    ["すひす", -1, "しはし"], ["すひす", -2, "さのさ"], ["すひす", -3, "こねこ"],
    ["すおは", -3, "こいぬ"], ["すおは", 43, "こいぬ"], ["えほん", 3, "きむう"], ["えほん", -43, "きむう"],
    ["こねこ", 3, "すひす"], ["あ", -1, "ん"], ["ん", 1, "あ"], ["あいう", -92, "あいう"],
  ])("transforms %s by %i to %s", (input, shift, expected) => expect(shiftWord(input, shift)).toBe(expected));
  it("rejects invalid input and replaces only one position", () => {
    for (const word of ["CAT", "が", "ゃ", "ア", "", "こねこ!"]) expect(() => shiftWord(word, 3)).toThrow();
    expect(() => shiftWord("こねこ", 1.5)).toThrow();
    expect(shiftWord("こねこ", 3)).not.toBe("すひそ");
    expect(replaceLetter("すひそ", 2, "す")).toBe("すひす");
    expect(replaceLetter("すひそ", 9, "す")).toBe("すひそ");
    for (const letter of ["", "すひ", "W", "が"]) expect(replaceLetter("すひそ", 2, letter)).toBe("すひそ");
  });
  it("cycles through 46 distinct hiragana and reverses shifts for every letter", () => {
    expect(LETTER_COUNT).toBe(46);
    expect(new Set(KANA).size).toBe(46);
    for (const letter of KANA) {
      expect(shiftWord(letter, 46)).toBe(letter);
      expect(shiftWord(shiftWord(letter, 3), -3)).toBe(letter);
      expect(shiftWord(letter, 43)).toBe(shiftWord(letter, -3));
    }
  });
});

describe("Caesar game progression", () => {
  it("shows the introduction on entry and preserves learning records when starting the bridge", () => {
    const progress = solve(start(), "backward", 3).progress;
    const intro = createState(progress);
    expect(intro.view).toBe("intro");
    expect(canExecute(intro)).toBe(false);
    expect(transition(intro, { type: "bridge-shift", shift: -3 })).toBe(intro);
    expect(transition(intro, { type: "hint" })).toBe(intro);
    const bridge = transition(intro, { type: "start", stage: 1 });
    expect(bridge.view).toBe("bridge");
    expect(bridgeWord(bridge)).toBe("すひす");
    expect(bridge.progress).toBe(progress);
    expect(createState(bridge.progress).view).toBe("intro");
  });
  it("moves all three bridge letters together, wraps, and locks only the snapped solution", () => {
    let state = transition(createState(), { type: "start", stage: 1 });
    for (const expected of ["しはし", "さのさ", "こねこ"]) {
      state = transition(state, { type: "bridge-shift", shift: -1 });
      expect(bridgeWord(state)).toBe(expected);
    }
    expect(state.phase).toBe("celebrating");
    expect(state.progress.bridgeCleared).toBe(true);
    expect(transition(state, { type: "bridge-shift", shift: 1 })).toBe(state);
    state = transition(state, { type: "start", stage: 1 });
    expect(transition(state, { type: "bridge-shift", shift: 46 }).bridgeShift).toBe(0);
    expect(bridgeWord(state)).toBe("すひす");
  });
  it("requires a direction, hides results until execution, and clears obsolete results", () => {
    let state = start();
    expect(canExecute(state)).toBe(false);
    expect(transition(state, { type: "execute" })).toBe(state);
    state = transition(state, { type: "direction", direction: "forward" });
    expect(state.result).toBeNull();
    const pending = transition(state, { type: "execute" });
    expect(pending.phase).toBe("executing");
    expect(pending.result).toBeNull();
    expect(transition(pending, { type: "execute" })).toBe(pending);
    expect(transition(pending, { type: "amount", amount: 3 })).toBe(pending);
    state = transition(pending, { type: "resolve" });
    expect(state.result).toBe("すおは");
    expect(state.phase).toBe("incorrect");
    expect(transition(state, { type: "direction", direction: "backward" }).result).toBeNull();
    expect(transition(state, { type: "amount", amount: 3 }).result).toBeNull();
    state = solve(state, "backward", 3);
    expect(state.result).toBe("こいぬ");
    expect(state.progress.records.decrypt).toEqual({ attempts: 2, hints: 0, firstCorrect: false, solved: true });
  });
  it.each([[["backward", 3], ["forward", 3]], [["forward", 43], ["backward", 43]]] as const)("accepts equivalent keys %j", (decrypt, encrypt) => {
    let state = solve(start(), decrypt[0], decrypt[1]);
    expect(state.correct).toBe(true);
    expect(transition(state, { type: "next" })).toBe(state);
    state = next(state);
    expect(state.questionIndex).toBe(1);
    expect(state.direction).toBeNull();
    expect(state.amount).toBe(0);
    expect(state.result).toBeNull();
    state = solve(state, encrypt[0], encrypt[1]);
    expect(state.result).toBe("きむう");
    expect(state.correct).toBe(true);
  });
  it("resets previous repairs when choosing another position, and validates the complete word", () => {
    let state = next(solve(next(solve(start(), "backward", 3)), "forward", 3));
    expect(canExecute(state)).toBe(false);
    state = transition(state, { type: "select-letter", index: 0 });
    state = transition(state, { type: "replace", letter: "せ" });
    expect(repairWord(state)).toBe("せひそ");
    expect(transition(state, { type: "select-letter", index: 0 })).toBe(state);
    state = transition(state, { type: "select-letter", index: 2 });
    expect(repairWord(state)).toBe("すひそ");
    for (const letter of ["", "すひ", "W", "が"]) expect(transition(state, { type: "replace", letter })).toBe(state);
    state = execute(state);
    expect(state.correct).toBe(false);
    state = transition(state, { type: "replace", letter: "す" });
    expect(state.result).toBeNull();
    state = execute(state);
    expect(state.correct).toBe(true);
    state = next(state);
    expect(state.view).toBe("complete");
    expect(state.progress.machineCleared).toBe(true);
    expect(transition(state, { type: "next" })).toBe(state);
  });
  it("records distinct hint views, first attempts and resets safely during execution", () => {
    let state = start();
    for (let i = 0; i < 5; i++) state = transition(state, { type: "hint" });
    expect(state.progress.records.decrypt.hints).toBe(2);
    state = solve(state, "backward", 3);
    expect(feedback(state.progress.records.decrypt)).toBe("assisted");
    expect(state.progress.records.decrypt.firstCorrect).toBe(true);
    expect(feedback(emptyProgress().records.encrypt)).toBe("again");
    const pending = transition(transition(start(), { type: "direction", direction: "forward" }), { type: "execute" });
    state = transition(pending, { type: "start", stage: 1 });
    expect(transition(state, { type: "resolve" })).toBe(state);
    expect(feedback(solve(start(), "backward", 3).progress.records.decrypt)).toBe("self");
  });
});

describe("Caesar local learning records", () => {
  it.each([null, "null", "{broken", '{"version":2}', '{"version":1,"records":null}'])("recovers from %s", raw => expect(parseProgress(raw)).toEqual(emptyProgress()));
  it("round-trips records and drops invalid counts and impossible completion", () => {
    const progress = solve(start(), "backward", 3).progress;
    expect(parseProgress(JSON.stringify(progress))).toEqual(progress);
    expect(parseProgress(JSON.stringify({ version: 1, machineCleared: true, records: { decrypt: { attempts: -1, hints: 99, solved: true } } }))).toEqual(emptyProgress());
  });
  it("continues when reads or writes fail", () => {
    expect(readProgress({ getItem: () => { throw new Error("blocked"); } })).toEqual({ progress: emptyProgress(), available: false });
    expect(saveProgress({ setItem: () => { throw new Error("quota"); } }, emptyProgress())).toBe(false);
  });
});
