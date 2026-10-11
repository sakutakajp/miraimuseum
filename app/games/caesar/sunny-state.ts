import { shiftWord, wrapShift } from "./cipher";
import { practices, sunnyQuestions } from "./sunny-questions";
import { intro, lessons } from "./sunny-copy";
import { emptySunnyProgress, type SunnyProgress } from "./sunny-progress";
export type SunnyView =
  | "intro"
  | "practice"
  | "cycle"
  | "key"
  | "quiz"
  | "nap"
  | "lesson";
export type Direction = "back" | "forward";
export interface SunnyState {
  view: SunnyView;
  index: number;
  phase: "entering" | "active" | "celebrating" | "waiting";
  shift: number;
  direction: Direction | null;
  amount: number;
  control: "direction" | "number" | "confirm";
  prediction: string | null;
  result: string | null;
  correct: boolean | null;
  hint: number;
  progress: SunnyProgress;
}
export type SunnyAction =
  | {
      type:
        | "ready"
        | "settle"
        | "next"
        | "restart"
        | "hint"
        | "submit"
        | "control-next"
        | "control-back";
    }
  | { type: "shift"; amount: number }
  | { type: "direction"; direction: Direction }
  | { type: "amount"; amount: number }
  | { type: "predict"; letter: string };
export function newSunnyState(progress = emptySunnyProgress()): SunnyState {
  return {
    view: "intro",
    index: 0,
    phase: "entering",
    shift: 0,
    direction: null,
    amount: 0,
    control: "direction",
    prediction: null,
    result: null,
    correct: null,
    hint: -1,
    progress,
  };
}
const enter = (s: SunnyState, view: SunnyView, index = 0): SunnyState => ({
  ...newSunnyState(s.progress),
  view,
  index,
});
export function practiceWord(s: SunnyState) {
  return shiftWord(practices[s.index]!.input, s.shift);
}
export function canSubmit(s: SunnyState) {
  return (
    s.phase === "active" &&
    s.view === "quiz" &&
    (sunnyQuestions[s.index]!.kind === "prediction"
      ? !!s.prediction
      : s.control === "confirm" && !!s.direction)
  );
}
/** A prediction has no board result until submission. All transfer tasks use the actual cipher function. */
export function sunnyTransition(
  s: SunnyState,
  action: SunnyAction,
): SunnyState {
  if (action.type === "restart") return enter(s, s.view, s.index);
  if (action.type === "ready")
    return s.phase === "entering" ? { ...s, phase: "active" } : s;
  if (action.type === "settle")
    return s.phase === "celebrating" ? { ...s, phase: "waiting" } : s;
  if (action.type === "next") {
    if (s.phase !== "active" && s.phase !== "waiting") return s;
    if (s.view === "intro")
      return s.index + 1 < intro.length
        ? enter(s, "intro", s.index + 1)
        : enter(s, "practice");
    if (s.view === "practice" && s.phase === "waiting")
      return s.index + 1 < practices.length
        ? enter(s, "practice", s.index + 1)
        : enter(s, "cycle");
    if (s.view === "cycle" && s.phase === "waiting")
      return s.index === 0 ? enter(s, "cycle", 1) : enter(s, "key");
    if (s.view === "key" && s.phase === "waiting") return enter(s, "quiz");
    if (s.view === "quiz" && s.phase === "waiting") {
      if (s.index + 1 < sunnyQuestions.length)
        return enter(s, "quiz", s.index + 1);
      return { ...enter(s, "nap"), progress: { ...s.progress, cleared: true } };
    }
    if (s.view === "nap") return enter(s, "lesson");
    if (s.view === "lesson" && s.index + 1 < lessons.length)
      return enter(s, "lesson", s.index + 1);
    return s;
  }
  if (s.phase !== "active") return s;
  if (action.type === "hint") {
    const hint = Math.min(s.view === "quiz" ? 2 : 0, s.hint + 1);
    if (s.view !== "quiz") return { ...s, hint };
    const id = sunnyQuestions[s.index]!.id,
      old = s.progress.records[id]!;
    return {
      ...s,
      hint,
      progress: {
        ...s.progress,
        records: {
          ...s.progress.records,
          [id]: { ...old, hints: Math.max(old.hints, hint + 1) },
        },
      },
    };
  }
  if (action.type === "shift") {
    if (!Number.isInteger(action.amount) || !action.amount) return s;
    if (s.view === "key") {
      const shift = s.shift + action.amount;
      if (action.amount !== 1 || shift > 2) return s;
      return {
        ...s,
        shift,
        correct: shift === 2 ? true : null,
        phase: shift === 2 ? "celebrating" : "active",
      };
    }
    if (s.view === "cycle") {
      if (action.amount !== (s.index === 0 ? 1 : -1)) return s;
      return {
        ...s,
        shift: action.amount,
        phase: "celebrating",
        correct: true,
      };
    }
    if (s.view !== "practice") return s;
    const p = practices[s.index]!;
    if (s.index === 0 && action.amount !== -1) return s;
    const shift = s.shift + action.amount;
    if (shift < p.min || shift > p.max) return s;
    const correct = shiftWord(p.input, shift) === p.expected;
    return {
      ...s,
      shift,
      correct: correct ? true : null,
      phase: correct ? "celebrating" : "active",
    };
  }
  if (s.view !== "quiz") return s;
  const q = sunnyQuestions[s.index]!;
  if (action.type === "predict") {
    if (q.kind !== "prediction" || !q.choices?.includes(action.letter))
      return s;
    return { ...s, prediction: action.letter, result: null, correct: null };
  }
  if (q.kind !== "prediction") {
    if (action.type === "direction")
      return ["back", "forward"].includes(action.direction)
        ? {
            ...s,
            direction: action.direction,
            control: "number",
            result: null,
            correct: null,
          }
        : s;
    if (action.type === "amount")
      return Number.isInteger(action.amount)
        ? {
            ...s,
            amount: wrapShift(action.amount),
            result: null,
            correct: null,
          }
        : s;
    if (action.type === "control-next" && s.direction)
      return { ...s, control: "confirm" };
    if (action.type === "control-back")
      return {
        ...s,
        control: s.control === "confirm" ? "number" : "direction",
        result: null,
        correct: null,
      };
  }
  if (action.type === "submit" && canSubmit(s)) {
    const result =
      q.kind === "prediction"
        ? shiftWord(q.input, q.shift)
        : shiftWord(q.input, s.amount * (s.direction === "back" ? -1 : 1));
    const correct =
      q.kind === "prediction" ? s.prediction === result : result === q.expected;
    const old = s.progress.records[q.id]!;
    return {
      ...s,
      result,
      correct,
      phase: correct ? "celebrating" : "active",
      progress: {
        ...s.progress,
        records: {
          ...s.progress.records,
          [q.id]: {
            ...old,
            attempts: Math.min(999999, old.attempts + 1),
            firstCorrect: old.firstCorrect ?? correct,
            solved: old.solved || correct,
          },
        },
      },
    };
  }
  return s;
}
