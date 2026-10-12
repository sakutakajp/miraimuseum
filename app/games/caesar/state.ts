import { isKanaLetter, replaceLetter, shiftWord, wrapShift } from "./cipher";
import { emptyProgress, type CaesarProgress } from "./progress";
import { bridgePuzzles, questions } from "./questions";

export type Phase = "entering" | "editing" | "executing" | "incorrect" | "celebrating" | "waiting";
export type Direction = "backward" | "forward";
export type ControlStep = "direction" | "number" | "confirm" | "repair";
export interface GameState {
  view: "intro" | "bridge" | "bridge-story" | "machine-intro" | "tutorial" | "machine" | "ending" | "complete";
  phase: Phase;
  storyIndex: number;
  bridgeIndex: number;
  bridgeShift: number;
  tutorialStep: number;
  questionIndex: number;
  controlStep: ControlStep;
  direction: Direction | null;
  amount: number;
  selectedLetter: number | null;
  replacement: string | null;
  result: string | null;
  correct: boolean | null;
  hintIndex: number;
  repaired: number;
  progress: CaesarProgress;
}
export type Action =
  | { type: "ready" | "next" | "restart" | "replay" | "hint" | "execute" | "resolve" | "settle" | "control-next" | "control-back" }
  | { type: "bridge-shift"; shift: number }
  | { type: "direction"; direction: Direction }
  | { type: "amount"; amount: number }
  | { type: "select-letter"; index: number }
  | { type: "replace"; letter: string };

export function createState(progress = emptyProgress()): GameState {
  return { view: "intro", phase: "entering", storyIndex: 0, bridgeIndex: 0, bridgeShift: 0, tutorialStep: 0, questionIndex: 0, controlStep: "direction", direction: null, amount: 0, selectedLetter: null, replacement: null, result: null, correct: null, hintIndex: -1, repaired: 0, progress };
}
export const bridgeWord = (state: GameState) => shiftWord(bridgePuzzles[state.bridgeIndex]!.input, state.bridgeShift);
export const editable = (state: GameState) => state.phase === "editing" || state.phase === "incorrect";
export function canExecute(state: GameState): boolean {
  return state.view === "machine" && editable(state) && (questions[state.questionIndex]!.id === "repair"
    ? state.controlStep === "repair" && state.selectedLetter !== null && state.replacement !== null
    : state.controlStep === "confirm" && state.direction !== null);
}
export function repairWord(state: GameState): string {
  const input = questions[state.questionIndex]!.input;
  return state.selectedLetter === null || state.replacement === null ? input : replaceLetter(input, state.selectedLetter, state.replacement);
}
const hideResult = (state: GameState): GameState => ({ ...state, phase: "editing", result: null, correct: null, hintIndex: -1 });
const arrive = (state: GameState, changes: Partial<GameState>): GameState => ({ ...state, phase: "entering", hintIndex: -1, ...changes });
function newQuestion(state: GameState, index: number): GameState {
  return arrive(state, { view: "machine", questionIndex: index, controlStep: questions[index]!.id === "repair" ? "repair" : "direction", direction: null, amount: 0, selectedLetter: null, replacement: null, result: null, correct: null });
}

/** No DOM, timers or speech here. Entry/celebration gates prevent repeated input skipping a screen. */
export function transition(state: GameState, action: Action): GameState {
  if (action.type === "replay") return createState();
  if (action.type === "restart") {
    if (state.view === "bridge") return arrive(state, { bridgeShift: 0, correct: null });
    if (state.view === "machine") return newQuestion(state, state.questionIndex);
    if (state.view === "tutorial") return arrive(state, { tutorialStep: 0 });
    return createState(state.progress);
  }
  if (action.type === "ready") return state.phase === "entering" ? { ...state, phase: "editing" } : state;
  if (action.type === "settle") return state.phase === "celebrating" ? { ...state, phase: "waiting" } : state;
  if (action.type === "next") {
    if (!editable(state) && state.phase !== "waiting") return state;
    switch (state.view) {
      case "intro": return state.storyIndex === 0 ? arrive(state, { storyIndex: 1 }) : arrive(state, { view: "bridge", storyIndex: 0 });
      case "bridge":
        if (state.phase !== "waiting") return state;
        return state.bridgeIndex < 3 ? arrive(state, { bridgeIndex: state.bridgeIndex + 1, bridgeShift: 0, correct: null }) : arrive(state, { view: "bridge-story", storyIndex: 0 });
      case "bridge-story": return state.storyIndex === 0 ? arrive(state, { storyIndex: 1 }) : arrive(state, { view: "machine-intro", storyIndex: 0 });
      case "machine-intro": return arrive(state, { view: "tutorial", tutorialStep: 0 });
      case "tutorial": return state.tutorialStep < 7 ? arrive(state, { tutorialStep: state.tutorialStep + 1 }) : newQuestion(state, 0);
      case "machine":
        if (state.phase !== "waiting") return state;
        return state.questionIndex < questions.length - 1 ? newQuestion(state, state.questionIndex + 1) : arrive(state, { view: "ending", storyIndex: 0 });
      case "ending": return state.storyIndex < 3 ? arrive(state, { storyIndex: state.storyIndex + 1 }) : arrive(state, { view: "complete" });
      default: return state;
    }
  }
  if (action.type === "bridge-shift") {
    if (state.view !== "bridge" || !editable(state) || !Number.isInteger(action.shift) || action.shift === 0 || (state.bridgeIndex === 0 && action.shift !== -1)) return state;
    const bridgeShift = wrapShift(state.bridgeShift + action.shift);
    const solved = shiftWord(bridgePuzzles[state.bridgeIndex]!.input, bridgeShift) === bridgePuzzles[state.bridgeIndex]!.expected;
    return { ...state, bridgeShift, hintIndex: -1, correct: solved, phase: solved ? "celebrating" : "editing", progress: solved && state.bridgeIndex === 3 ? { ...state.progress, bridgeCleared: true } : state.progress };
  }
  if (action.type === "hint" && state.view === "bridge" && editable(state)) return { ...state, hintIndex: 0 };
  if (state.view !== "machine") return state;
  const question = questions[state.questionIndex]!;
  if (action.type === "resolve") {
    if (state.phase !== "executing") return state;
    const result = question.id === "repair" ? repairWord(state) : shiftWord(question.input, state.direction === "forward" ? state.amount : -state.amount);
    const correct = result === question.expected;
    const record = state.progress.records[question.id];
    const repaired = correct && question.id !== "door" ? state.questionIndex + 1 : state.repaired;
    return { ...state, result, correct, repaired, phase: correct ? "celebrating" : "incorrect", progress: { ...state.progress,
      machineCleared: state.progress.machineCleared || repaired === 3,
      doorCleared: state.progress.doorCleared || (correct && question.id === "door"),
      records: { ...state.progress.records, [question.id]: { ...record, attempts: record.attempts + 1, firstCorrect: record.firstCorrect ?? correct, solved: record.solved || correct } } } };
  }
  if (!editable(state)) return state;
  switch (action.type) {
    case "direction": return state.controlStep !== "direction" || question.id === "repair" ? state : arrive(hideResult(state), { direction: action.direction, controlStep: "number" });
    case "amount": return state.controlStep !== "number" || !Number.isInteger(action.amount) ? state : { ...hideResult(state), amount: wrapShift(action.amount) };
    case "control-next": return state.controlStep === "number" && state.direction !== null ? arrive(hideResult(state), { controlStep: "confirm" }) : state;
    case "control-back": return state.controlStep === "number" || state.controlStep === "confirm" ? arrive(hideResult(state), { controlStep: state.controlStep === "confirm" ? "number" : "direction" }) : state;
    case "select-letter": return question.id !== "repair" || !Number.isInteger(action.index) || action.index < 0 || action.index >= question.input.length || action.index === state.selectedLetter ? state : { ...hideResult(state), selectedLetter: action.index, replacement: question.input[action.index]! };
    case "replace": return question.id !== "repair" || state.selectedLetter === null || !isKanaLetter(action.letter) ? state : { ...hideResult(state), replacement: action.letter };
    case "hint": {
      const record = state.progress.records[question.id];
      const hintIndex = Math.min(question.hints.length - 1, state.hintIndex + 1);
      return { ...state, hintIndex, progress: record.hints >= hintIndex + 1 ? state.progress : { ...state.progress, records: { ...state.progress.records, [question.id]: { ...record, hints: hintIndex + 1 } } } };
    }
    case "execute": return canExecute(state) ? { ...state, phase: "executing", result: null, correct: null, hintIndex: -1 } : state;
    default: return state;
  }
}
