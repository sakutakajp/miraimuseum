import { describe, expect, it } from "vitest";
import { KANA, KANA_ROWS, LETTER_COUNT, shiftWord, replaceLetter } from "../app/games/caesar/cipher";
import { bridgePuzzles, questions } from "../app/games/caesar/questions";
import { SAVE_KEY, emptyProgress, feedback, parseProgress, readProgress, saveProgress } from "../app/games/caesar/progress";
import { bridgeWord, canExecute, createState, repairWord, transition, type GameState, type Direction } from "../app/games/caesar/state";

const ready = (state: GameState) => transition(state, { type: "ready" });
const next = (state: GameState) => ready(transition(transition(state, { type: "settle" }), { type: "next" }));
const startBridge = () => next(next(ready(createState())));
function machine() {
  let s = startBridge();
  for (const puzzle of bridgePuzzles) s = next(transition(s, { type: "bridge-shift", shift: puzzle.shift }));
  while (s.view !== "machine") s = next(s);
  return s;
}
function configured(s: GameState, direction: Direction, amount: number) {
  s = ready(transition(s, { type: "direction", direction }));
  s = transition(s, { type: "amount", amount });
  return ready(transition(s, { type: "control-next" }));
}
const execute = (s: GameState) => transition(transition(s, { type: "execute" }), { type: "resolve" });
const solve = (s: GameState, direction: Direction, amount: number) => execute(configured(s, direction, amount));
const repairQuestion = () => next(solve(next(solve(machine(), "backward", 3)), "forward", 3));
function repaired() {
  let s = transition(repairQuestion(), { type: "select-letter", index: 1 });
  s = transition(s, { type: "replace", letter: "す" });
  return execute(s);
}

describe("46-letter cipher and exact curriculum", () => {
  it.each([
    ["い", -1, "あ"], ["う", -1, "い"], ["うお", -1, "いえ"],
    ["すひす", -1, "しはし"], ["すひす", -2, "さのさ"], ["すひす", -3, "こねこ"],
    ["くかと", -3, "おうち"], ["くかと", 43, "おうち"], ["ここ", 3, "すす"], ["ここ", -43, "すす"],
    ["ねこ", 3, "ひす"], ["えか", -2, "いえ"], ["えか", 44, "いえ"],
    ["あ", -1, "ん"], ["ん", 1, "あ"], ["を", 1, "ん"], ["あいう", -92, "あいう"],
  ])("%s shifted %i = %s", (input, shift, expected) => expect(shiftWord(input, shift)).toBe(expected));
  it("verifies every authored question with the actual function", () => {
    for (const q of bridgePuzzles) expect(shiftWord(q.input, q.shift)).toBe(q.expected);
    for (const q of questions) expect(shiftWord(q.source || q.input, q.shift)).toBe(q.expected);
    expect(shiftWord("ひせ", -3)).not.toBe("ねこ");
    expect(shiftWord("えか", -3)).not.toBe("いえ");
  });
  it("shares the chart data, counts no empty cells and reverses every shift", () => {
    expect(KANA).toBe("あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをん");
    expect(KANA_ROWS.join("")).toBe(KANA); expect(LETTER_COUNT).toBe(46); expect(new Set(KANA).size).toBe(46);
    for (const char of KANA) for (let shift = -46; shift <= 46; shift++) {
      expect(shiftWord(shiftWord(char, shift), -shift)).toBe(char);
      expect(shiftWord(char, shift + 46)).toBe(shiftWord(char, shift));
    }
  });
  it("rejects unsupported letters, empty strings and fractional shifts", () => {
    for (const word of ["CAT", "が", "ゃ", "ア", "", "こねこ!", "ー", "ぱ"]) expect(() => shiftWord(word, 3)).toThrow();
    expect(() => shiftWord("こねこ", 1.5)).toThrow();
    expect(replaceLetter("ひせ", 1, "す")).toBe("ひす");
    for (const char of ["", "すひ", "W", "が"]) expect(replaceLetter("ひせ", 1, char)).toBe("ひせ");
    expect(replaceLetter("ひせ", 9, "す")).toBe("ひせ");
  });
});

describe("first-grade adventure progression", () => {
  it("shows one conversation at a time and gates repeated next events", () => {
    let s = createState(); expect(s.view).toBe("intro");
    expect(transition(s, { type: "next" })).toBe(s);
    s = transition(ready(s), { type: "next" });
    expect(s.storyIndex).toBe(1); expect(s.phase).toBe("entering");
    expect(transition(s, { type: "next" })).toBe(s);
    expect(next(ready(s)).view).toBe("bridge");
  });
  it("first practice only accepts the guided back-one action", () => {
    let s = startBridge(); expect(bridgeWord(s)).toBe("い");
    expect(transition(s, { type: "bridge-shift", shift: 1 })).toBe(s);
    expect(transition(s, { type: "bridge-shift", shift: -2 })).toBe(s);
    s = transition(s, { type: "bridge-shift", shift: -1 }); expect(bridgeWord(s)).toBe("あ");
    expect(s.phase).toBe("celebrating"); expect(s.progress.bridgeCleared).toBe(false);
    expect(transition(s, { type: "next" })).toBe(s);
    expect(transition(s, { type: "bridge-shift", shift: -1 })).toBe(s);
    expect(next(s).bridgeIndex).toBe(1);
  });
  it("switches 1/1/2/3 synced bands in place, with no practice assessment", () => {
    let s = startBridge();
    for (const [index, puzzle] of bridgePuzzles.entries()) {
      expect(s.bridgeIndex).toBe(index); expect(bridgeWord(s)).toBe(puzzle.input);
      s = transition(s, { type: "bridge-shift", shift: puzzle.shift });
      expect(bridgeWord(s)).toBe(puzzle.expected); expect(s.progress.records).toEqual(emptyProgress().records);
      s = next(s);
    }
    expect(s.view).toBe("bridge-story"); expect(s.progress.bridgeCleared).toBe(true);
  });
  it("keeps the three intermediate bridge words and locks the final snap", () => {
    let s = startBridge();
    for (let i = 0; i < 3; i++) s = next(transition(s, { type: "bridge-shift", shift: -1 }));
    for (const expected of ["しはし", "さのさ", "こねこ"]) {
      s = transition(s, { type: "bridge-shift", shift: -1 }); expect(bridgeWord(s)).toBe(expected);
    }
    expect(s.phase).toBe("celebrating"); expect(s.progress.bridgeCleared).toBe(true);
    expect(transition(s, { type: "bridge-shift", shift: 1 })).toBe(s);
    const restart = ready(transition(s, { type: "restart" })); expect(restart.bridgeIndex).toBe(3); expect(bridgeWord(restart)).toBe("すひす");
    expect(transition(restart, { type: "bridge-shift", shift: 46 }).bridgeShift).toBe(0);
    expect(transition(restart, { type: "bridge-shift", shift: NaN })).toBe(restart);
  });
  it("counts moves from zero, then reverses, without grading the tutorial", () => {
    let s = startBridge();
    for (const q of bridgePuzzles) s = next(transition(s, { type: "bridge-shift", shift: q.shift }));
    s = next(next(next(s))); expect(s.view).toBe("tutorial");
    const positions: number[] = [];
    for (let i = 0; i < 8; i++) {
      positions.push(s.tutorialStep < 4 ? s.tutorialStep : 7 - s.tutorialStep);
      expect(s.progress.records).toEqual(emptyProgress().records); s = next(s);
    }
    expect(positions).toEqual([0, 1, 2, 3, 3, 2, 1, 0]); expect(s.view).toBe("machine"); expect(s.direction).toBeNull(); expect(s.amount).toBe(0);
  });
  it("requires direction, number and confirmation before execution", () => {
    let s = machine(); expect(canExecute(s)).toBe(false); expect(s.result).toBeNull();
    expect(transition(s, { type: "amount", amount: 3 })).toBe(s);
    expect(transition(s, { type: "execute" })).toBe(s);
    s = transition(s, { type: "direction", direction: "backward" }); expect(s.controlStep).toBe("number"); expect(s.phase).toBe("entering");
    expect(transition(s, { type: "control-next" })).toBe(s);
    s = transition(ready(s), { type: "amount", amount: 3 }); expect(s.result).toBeNull(); expect(canExecute(s)).toBe(false);
    s = ready(transition(s, { type: "control-next" })); expect(canExecute(s)).toBe(true); expect(s.result).toBeNull();
  });
  it("retains direction/count on back and cycles the count 0..45", () => {
    let s = configured(machine(), "backward", 3);
    s = ready(transition(s, { type: "control-back" })); expect(s.amount).toBe(3); expect(s.direction).toBe("backward");
    s = ready(transition(s, { type: "control-back" })); expect(s.controlStep).toBe("direction"); expect(s.amount).toBe(3);
    s = ready(transition(s, { type: "direction", direction: "forward" })); expect(s.amount).toBe(3); expect(s.direction).toBe("forward");
    s = transition(s, { type: "amount", amount: -1 }); expect(s.amount).toBe(45);
    expect(transition(s, { type: "amount", amount: 46 }).amount).toBe(0);
    expect(transition(s, { type: "amount", amount: 1.5 })).toBe(s);
  });
  it("hides the result while executing and rejects doubled input/resolve", () => {
    let s = transition(configured(machine(), "backward", 3), { type: "execute" }); expect(s.result).toBeNull();
    for (const action of [{ type: "execute" }, { type: "next" }, { type: "amount", amount: 4 }] as const) expect(transition(s, action)).toBe(s);
    s = transition(s, { type: "resolve" }); expect(s.result).toBe("おうち"); expect(s.progress.records.decrypt.attempts).toBe(1);
    expect(transition(s, { type: "resolve" })).toBe(s); expect(transition(s, { type: "execute" })).toBe(s);
  });
  it("friendly retry clears obsolete results and preserves first-attempt evidence", () => {
    let s = solve(machine(), "forward", 3); expect(s.correct).toBe(false); expect(s.phase).toBe("incorrect");
    s = ready(transition(s, { type: "control-back" })); expect(s.result).toBeNull(); expect(s.correct).toBeNull();
    s = ready(transition(s, { type: "control-back" })); s = solve(s, "backward", 3);
    expect(s.result).toBe("おうち"); expect(s.progress.records.decrypt).toEqual({ attempts: 2, hints: 0, firstCorrect: false, solved: true });
  });
  it.each([["backward", 3, "forward", 3], ["forward", 43, "backward", 43]] as const)("accepts equivalent directions %s %i / %s %i", (d1, n1, d2, n2) => {
    let s = solve(machine(), d1, n1); expect(s.correct).toBe(true);
    s = next(s); expect(s.direction).toBeNull(); expect(s.amount).toBe(0); expect(s.result).toBeNull();
    s = solve(s, d2, n2); expect(s.result).toBe("すす"); expect(s.correct).toBe(true);
  });
  it("switching repair selection discards the previous patch and checks the whole word", () => {
    let s = repairQuestion(); expect(canExecute(s)).toBe(false);
    s = transition(s, { type: "select-letter", index: 1 }); expect(execute(s).correct).toBe(false);
    s = transition(s, { type: "replace", letter: "す" }); expect(repairWord(s)).toBe("ひす");
    s = transition(s, { type: "select-letter", index: 0 }); expect(repairWord(s)).toBe("ひせ"); expect(s.replacement).toBe("ひ");
    s = transition(s, { type: "replace", letter: "は" }); expect(repairWord(s)).toBe("はせ");
    s = transition(s, { type: "select-letter", index: 1 }); expect(repairWord(s)).toBe("ひせ");
    s = execute(transition(s, { type: "replace", letter: "す" })); expect(s.result).toBe("ひす"); expect(s.repaired).toBe(3);
    expect(s.progress.machineCleared).toBe(true); expect(s.progress.doorCleared).toBe(false);
  });
  it("keeps optional hints separate from guided practices and rejects hints after success", () => {
    let s = transition(machine(), { type: "hint" }); expect(s.progress.records.decrypt.hints).toBe(1); expect(s.result).toBeNull();
    s = transition(s, { type: "hint" }); s = transition(s, { type: "hint" }); expect(s.progress.records.decrypt.hints).toBe(2);
    s = solve(s, "backward", 3); expect(transition(s, { type: "hint" })).toBe(s); expect(feedback(s.progress.records.decrypt)).toBe("assisted");
    expect(transition(createState(), { type: "hint" }).progress.records.decrypt.hints).toBe(0);
  });
  it("adds a different final key and separately records attempts and hints", () => {
    let s = next(repaired()); expect(s.questionIndex).toBe(3); expect(s.repaired).toBe(3); expect(s.direction).toBeNull(); expect(s.amount).toBe(0);
    s = solve(s, "backward", 3); expect(s.correct).toBe(false); expect(s.progress.records.door.firstCorrect).toBe(false);
    s = ready(transition(s, { type: "restart" })); s = transition(s, { type: "hint" }); s = solve(s, "forward", 44);
    expect(s.result).toBe("いえ"); expect(s.progress.doorCleared).toBe(true); expect(s.progress.records.door).toMatchObject({ hints: 1, attempts: 2, firstCorrect: false });
    expect(s.progress.records.repair.attempts).toBe(1);
    s = next(s); expect(s.view).toBe("ending");
    for (let i = 0; i < 4; i++) s = next(s); expect(s.view).toBe("complete");
    expect(transition(s, { type: "replay" }).progress).toEqual(emptyProgress());
  });
});

describe("versioned records and storage failures", () => {
  it("round-trips v2 and does not reinterpret v1 or other curricula", () => {
    const progress = repaired().progress;
    expect(parseProgress(JSON.stringify(progress))).toEqual(progress);
    expect(SAVE_KEY).toBe("mirai-museum:caesar:v2");
    for (const raw of [null, "{", '{"version":1}', JSON.stringify({ ...progress, curriculum: "other" })]) expect(parseProgress(raw)).toEqual(emptyProgress());
    expect(createState(progress).view).toBe("intro"); expect(createState(progress).repaired).toBe(0);
  });
  it("rejects malformed statistics and impossible completion flags", () => {
    const data = emptyProgress(); data.machineCleared = true; data.doorCleared = true;
    data.records.decrypt = { attempts: -2, hints: 999, firstCorrect: true, solved: true };
    expect(parseProgress(JSON.stringify(data))).toEqual(emptyProgress());
    data.records.decrypt = { attempts: 0, hints: 1, firstCorrect: true, solved: true };
    expect(parseProgress(JSON.stringify(data)).records.decrypt).toEqual({ attempts: 0, hints: 1, firstCorrect: null, solved: false });
  });
  it("works when storage is denied and differentiates evidence-based feedback", () => {
    expect(readProgress({ getItem() { throw new Error("denied"); } })).toEqual({ progress: emptyProgress(), available: false });
    expect(saveProgress({ setItem() { throw new Error("quota"); } }, emptyProgress())).toBe(false);
    expect(feedback({ attempts: 1, firstCorrect: true, hints: 0, solved: true })).toBe("self");
    expect(feedback({ attempts: 2, firstCorrect: false, hints: 0, solved: true })).toBe("tried");
    expect(feedback(emptyProgress().records.door)).toBe("again");
  });
});
