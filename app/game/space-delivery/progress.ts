export const SAVE_KEY = "mirai-museum:space-delivery:v1";
export interface Progress {
  version: 1;
  best: number[];
  unlocked: number;
  muted: boolean;
  tutorialSeen: boolean;
}
export const emptyProgress = (): Progress => ({
  version: 1,
  best: [0, 0, 0, 0, 0, 0],
  unlocked: 1,
  muted: false,
  tutorialSeen: false,
});
export function parseProgress(raw: string | null): Progress {
  const result = emptyProgress();
  try {
    const saved = JSON.parse(raw ?? "null");
    if (saved?.version !== 1 || !Array.isArray(saved.best)) return result;
    result.best = result.best.map((_, i) =>
      Number.isInteger(saved.best[i]) &&
      saved.best[i] >= 0 &&
      saved.best[i] <= 3
        ? saved.best[i]
        : 0,
    );
    // Unlock only a contiguous chain of delivered stages, never trust an arbitrary saved unlock count.
    while (result.unlocked < 6 && result.best[result.unlocked - 1]! > 0)
      result.unlocked++;
    result.muted = saved.muted === true;
    result.tutorialSeen = saved.tutorialSeen === true;
  } catch {
    /* Broken or unavailable storage never prevents play. */
  }
  return result;
}
export function recordDelivery(
  progress: Progress,
  stageId: number,
  collected: number,
): Progress {
  const next = { ...progress, best: [...progress.best] };
  if (stageId < 1 || stageId > next.unlocked) return next;
  next.best[stageId - 1] = Math.max(
    next.best[stageId - 1]!,
    Math.min(3, 1 + collected),
  );
  next.unlocked = Math.max(next.unlocked, Math.min(6, stageId + 1));
  return next;
}
