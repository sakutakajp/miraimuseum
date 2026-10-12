import { sunnyQuestions } from "./sunny-questions";
export const SUNNY_SAVE_KEY = "mirai-museum:caesar:v3";
export interface AttemptRecord {
  attempts: number;
  hints: number;
  firstCorrect: boolean | null;
  solved: boolean;
}
export interface SunnyProgress {
  version: 3;
  curriculum: "ru-sunny-1";
  cleared: boolean;
  records: Record<string, AttemptRecord>;
}
export function emptySunnyProgress(): SunnyProgress {
  return {
    version: 3,
    curriculum: "ru-sunny-1",
    cleared: false,
    records: Object.fromEntries(
      sunnyQuestions.map((q) => [
        q.id,
        { attempts: 0, hints: 0, firstCorrect: null, solved: false },
      ]),
    ),
  };
}
export function parseSunnyProgress(raw: string | null): SunnyProgress {
  const next = emptySunnyProgress();
  try {
    const data = JSON.parse(raw || "null");
    if (data?.version !== 3 || data.curriculum !== next.curriculum) return next;
    for (const q of sunnyQuestions) {
      const r = data.records?.[q.id];
      if (
        !r ||
        !Number.isInteger(r.attempts) ||
        r.attempts < 0 ||
        r.attempts > 999999 ||
        !Number.isInteger(r.hints) ||
        r.hints < 0 ||
        r.hints > 3
      )
        continue;
      if (
        r.attempts === 0
          ? r.firstCorrect !== null || r.solved !== false
          : typeof r.firstCorrect !== "boolean" || typeof r.solved !== "boolean"
      )
        continue;
      next.records[q.id] = {
        attempts: r.attempts,
        hints: r.hints,
        firstCorrect: r.firstCorrect,
        solved: r.solved,
      };
    }
    next.cleared =
      data.cleared === true &&
      sunnyQuestions.every((q) => next.records[q.id]!.solved);
  } catch {}
  return next;
}
export function readSunnyProgress(storage: Pick<Storage, "getItem">) {
  try {
    return parseSunnyProgress(storage.getItem(SUNNY_SAVE_KEY));
  } catch {
    return emptySunnyProgress();
  }
}
export function saveSunnyProgress(
  storage: Pick<Storage, "setItem">,
  progress: SunnyProgress,
) {
  try {
    storage.setItem(SUNNY_SAVE_KEY, JSON.stringify(progress));
    return true;
  } catch {
    return false;
  }
}
