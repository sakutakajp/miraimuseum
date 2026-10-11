import { replaceLetter, shiftWord, wrap26 } from "./cipher";
import { emptyProgress, emptyRecords, type CaesarProgress } from "./progress";
import { questions } from "./questions";

export type Phase = "editing" | "executing" | "incorrect" | "celebrating" | "waiting";
export type Direction = "backward" | "forward";
export interface GameState {
  view: "bridge" | "machine" | "complete" | "menu";
  phase: Phase;
  bridgeShift: number;
  guideDone: boolean;
  questionIndex: number;
  direction: Direction | null;
  amount: number;
  selectedLetter: number | null;
  replacement: string | null;
  result: string | null;
  correct: boolean | null;
  progress: CaesarProgress;
}
export type Action =
  | { type: "start"; stage: 1 | 2 }
  | { type: "menu" }
  | { type: "bridge-shift"; shift: number }
  | { type: "direction"; direction: Direction }
  | { type: "amount"; amount: number }
  | { type: "select-letter"; index: number }
  | { type: "replace"; letter: string }
  | { type: "hint" }
  | { type: "execute" }
  | { type: "resolve" }
  | { type: "settle" }
  | { type: "next" };

export function createState(progress = emptyProgress()): GameState {
  return { view: "bridge", phase: "editing", bridgeShift: 0, guideDone: false, questionIndex: 0, direction: null, amount: 0, selectedLetter: null, replacement: null, result: null, correct: null, progress };
}
export const bridgeWord = (state: GameState) => shiftWord("FDW", state.bridgeShift);
export const editable = (state: GameState) => state.phase === "editing" || state.phase === "incorrect";
export function canExecute(state: GameState): boolean {
  return state.view === "machine" && editable(state) && (questions[state.questionIndex]!.id === "repair" ? state.selectedLetter !== null && state.replacement !== null : state.direction !== null);
}
export function repairWord(state: GameState): string {
  const input = questions[state.questionIndex]!.input;
  return state.selectedLetter === null || state.replacement === null ? input : replaceLetter(input, state.selectedLetter, state.replacement);
}
const hideResult = (state: GameState): GameState => ({ ...state, phase: "editing", result: null, correct: null });

/** Browser-independent state transitions. Timed visual phases are explicitly resolved by the UI. */
export function transition(state: GameState, action: Action): GameState {
  if (action.type === "start") {
    const next = createState(state.progress);
    return action.stage === 1 ? next : { ...next, view: "machine", progress: { ...next.progress, machineCleared: false, records: emptyRecords() } };
  }
  if (action.type === "menu") return { ...state, view: "menu", phase: "editing" };
  if (action.type === "bridge-shift") {
    if (state.view !== "bridge" || !editable(state)) return state;
    const bridgeShift = wrap26(state.bridgeShift + action.shift);
    const solved = shiftWord("FDW", bridgeShift) === "CAT";
    return { ...state, bridgeShift, guideDone: true, phase: solved ? "celebrating" : "editing", progress: solved ? { ...state.progress, bridgeCleared: true } : state.progress };
  }
  if (action.type === "settle") return state.phase === "celebrating" ? { ...state, phase: "waiting" } : state;
  if (action.type === "next") {
    if (state.view !== "machine" || state.phase !== "waiting") return state;
    if (state.questionIndex === questions.length - 1) return { ...state, view: "complete", progress: { ...state.progress, machineCleared: true } };
    return { ...state, questionIndex: state.questionIndex + 1, direction: null, amount: 0, selectedLetter: null, replacement: null, result: null, correct: null, phase: "editing" };
  }
  if (state.view !== "machine") return state;
  const question = questions[state.questionIndex]!;
  if (action.type === "resolve") {
    if (state.phase !== "executing") return state;
    const result = question.id === "repair" ? repairWord(state) : shiftWord(question.input, state.direction === "forward" ? state.amount : -state.amount);
    const correct = result === question.expected;
    const record = state.progress.records[question.id];
    return { ...state, result, correct, phase: correct ? "celebrating" : "incorrect", progress: { ...state.progress, records: { ...state.progress.records, [question.id]: { ...record, attempts: record.attempts + 1, firstCorrect: record.firstCorrect ?? correct, solved: correct } } } };
  }
  if (!editable(state)) return state;
  switch (action.type) {
    case "direction": return question.id === "repair" ? state : { ...hideResult(state), direction: action.direction };
    case "amount": return question.id === "repair" ? state : { ...hideResult(state), amount: wrap26(action.amount) };
    case "select-letter": return question.id !== "repair" || !Number.isInteger(action.index) || action.index < 0 || action.index >= question.input.length || action.index === state.selectedLetter ? state : { ...hideResult(state), selectedLetter: action.index, replacement: question.input[action.index]! };
    case "replace": return question.id !== "repair" || state.selectedLetter === null || !/^[A-Z]$/.test(action.letter) ? state : { ...hideResult(state), replacement: action.letter };
    case "hint": {
      const record = state.progress.records[question.id];
      return record.hints >= question.hints.length ? state : { ...state, progress: { ...state.progress, records: { ...state.progress.records, [question.id]: { ...record, hints: record.hints + 1 } } } };
    }
    case "execute": return canExecute(state) ? { ...state, phase: "executing", result: null, correct: null } : state;
    default: return state;
  }
}
