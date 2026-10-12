import { questions, type QuestionKind } from "./questions";

// v1 used different questions. Never interpret those results as this curriculum.
export const SAVE_KEY = "mirai-museum:caesar:v2";
export interface QuestionRecord { attempts: number; hints: number; firstCorrect: boolean | null; solved: boolean }
export interface CaesarProgress {
  version: 2;
  curriculum: "mii-home-1";
  bridgeCleared: boolean;
  machineCleared: boolean;
  doorCleared: boolean;
  records: Record<QuestionKind, QuestionRecord>;
}
export function emptyRecords(): CaesarProgress["records"] {
  return Object.fromEntries(questions.map(({ id }) => [id, { attempts: 0, hints: 0, firstCorrect: null, solved: false }])) as CaesarProgress["records"];
}
export function emptyProgress(): CaesarProgress {
  return { version: 2, curriculum: "mii-home-1", bridgeCleared: false, machineCleared: false, doorCleared: false, records: emptyRecords() };
}
export function parseProgress(raw: string | null): CaesarProgress {
  try {
    const data = JSON.parse(raw || "null");
    if (data?.version !== 2 || data.curriculum !== "mii-home-1" || !data.records) return emptyProgress();
    const progress = emptyProgress();
    progress.bridgeCleared = data.bridgeCleared === true;
    for (const question of questions) {
      const value = data.records[question.id];
      if (!value || !Number.isSafeInteger(value.attempts) || value.attempts < 0 || !Number.isInteger(value.hints) || value.hints < 0 || value.hints > question.hints.length) continue;
      progress.records[question.id] = { attempts: value.attempts, hints: value.hints, firstCorrect: value.attempts > 0 && typeof value.firstCorrect === "boolean" ? value.firstCorrect : null, solved: value.attempts > 0 && value.solved === true };
    }
    progress.machineCleared = data.machineCleared === true && questions.slice(0, 3).every(q => progress.records[q.id].solved);
    progress.doorCleared = data.doorCleared === true && progress.machineCleared && progress.records.door.solved;
    return progress;
  } catch { return emptyProgress(); }
}
export function readProgress(storage: Pick<Storage, "getItem">): { progress: CaesarProgress; available: boolean } {
  try { return { progress: parseProgress(storage.getItem(SAVE_KEY)), available: true }; }
  catch { return { progress: emptyProgress(), available: false }; }
}
export function saveProgress(storage: Pick<Storage, "setItem">, progress: CaesarProgress): boolean {
  try { storage.setItem(SAVE_KEY, JSON.stringify(progress)); return true; }
  catch { return false; }
}
export function feedback(record: QuestionRecord): "self" | "assisted" | "tried" | "again" {
  if (!record.solved) return "again";
  if (record.hints > 0) return "assisted";
  return record.firstCorrect ? "self" : "tried";
}
