import type { ClearResult, DeepTimeRecord, Rank } from "../types";
export const DEEP_TIME_SAVE_KEY = "mirai-museum:deep-time:v1";
export function emptyRecord(): DeepTimeRecord {
  return {
    bestProgress: 0,
    bestClearScore: 0,
    bestSync: 0,
    cleared: false,
    attempts: 0,
  };
}
const finite = (v: unknown, max: number) =>
  typeof v === "number" && Number.isFinite(v)
    ? Math.max(0, Math.min(max, v))
    : 0;
export function parseRecord(raw: string | null): DeepTimeRecord {
  try {
    const v = JSON.parse(raw || "{}");
    return {
      bestProgress: finite(v.bestProgress, 1),
      bestClearScore: Math.floor(finite(v.bestClearScore, 100000)),
      bestSync: finite(v.bestSync, 1),
      bestRank: ["S", "A", "B", "C"].includes(v.bestRank)
        ? (v.bestRank as Rank)
        : undefined,
      cleared: v.cleared === true,
      attempts: Math.floor(finite(v.attempts, 1e9)),
    };
  } catch {
    return emptyRecord();
  }
}
export function recordClear(
  record: DeepTimeRecord,
  result: ClearResult,
): DeepTimeRecord {
  const better = result.score > record.bestClearScore;
  return {
    ...record,
    bestProgress: 1,
    bestClearScore: Math.max(record.bestClearScore, result.score),
    bestSync: Math.max(record.bestSync, result.sync),
    bestRank: better || !record.bestRank ? result.rank : record.bestRank,
    cleared: true,
  };
}
