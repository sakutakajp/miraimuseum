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
      for (const [id, value] of Object.entries(saved.stages || {})) {
        const stage = Number(id);
        const v = value as { best?: unknown; cleared?: unknown };
        if (!Number.isInteger(stage) || stage < 1 || stage > 5) continue;
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
        0,
        ...Object.values(result[game.id].stages).map((s) => s.best),
      );
      if (game.id === 'star-flight' && Array.isArray(saved.discoveries))
        result[game.id].discoveries = saved.discoveries.includes('asteroid') ? ['asteroid'] : [];
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
  if (result.game === 'star-flight' && result.cleared)
    record.discoveries = ['asteroid'];
  return next;
}
