import { games, type GameId, type StageResult } from "./catalog";
export const GAME_SAVE_KEY = "mirai-museum:v2";
export interface GameRecord {
  best: number;
  stages: Record<string, { best: number; cleared: boolean }>;
  unlocked: number;
  discoveries?: string[];
}
export type GameProgress = Record<GameId, GameRecord>;
export function emptyGameProgress(): GameProgress {
  return Object.fromEntries(
    games.map((g) => [g.id, { best: 0, stages: {}, unlocked: 1 }]),
  ) as GameProgress;
}
export function parseGameProgress(raw: string | null): GameProgress {
  const result = emptyGameProgress();
  try {
    const data = JSON.parse(raw || "{}");
    for (const game of games) {
      const saved = data?.[game.id];
      if (!saved) continue;
      if (typeof saved.unlocked === "number" && Number.isFinite(saved.unlocked))
        result[game.id].unlocked = Math.max(1, Math.min(5, Math.floor(saved.unlocked)));
      for (const [id, value] of Object.entries(saved.stages || {})) {
        const stage = Number(id);
        const v = value as { best?: unknown; cleared?: unknown };
        if (!Number.isInteger(stage) || stage < 1 || stage > 99) continue;
        result[game.id].stages[id] = {
          best: validScore(v.best),
          cleared: v.cleared === true,
        };
        if (v.cleared === true)
          result[game.id].unlocked = Math.max(
            result[game.id].unlocked,
            Math.min(5, stage + 1),
          );
      }
      result[game.id].best = Math.max(
        validScore(saved.best),
        ...Object.values(result[game.id].stages).map((s) => s.best),
      );
    }
  } catch {}
  return result;
}
function validScore(value: unknown) {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, Math.min(9999999, Math.floor(value)))
    : 0;
}
export function recordGameResult(
  progress: GameProgress,
  result: StageResult,
): GameProgress {
  const next = parseGameProgress(JSON.stringify(progress));
  if (!result.cleared) return next;
  const record = next[result.game];
  const old = record.stages[result.stage];
  record.stages[result.stage] = {
    best: Math.max(old?.best || 0, validScore(result.score)),
    cleared: !!old?.cleared || result.cleared,
  };
  record.best = Math.max(record.best, validScore(result.score));
  if (result.cleared)
    record.unlocked = Math.max(record.unlocked, Math.min(5, result.stage + 1));
  return next;
}

/** Keep unknown older game records and fields when adding a current clear. */
export function savedGameResult(raw: string | null, result: StageResult): string {
  let original: Record<string, unknown> = {};
  try { const value = JSON.parse(raw || "{}"); if (value && typeof value === "object" && !Array.isArray(value)) original = value; } catch {}
  const records = recordGameResult(parseGameProgress(raw), result);
  const merged = { ...original };
  for (const game of games) {
    const previous = original[game.id];
    merged[game.id] = { ...(previous && typeof previous === "object" ? previous : {}), ...records[game.id] };
  }
  return JSON.stringify(merged);
}
