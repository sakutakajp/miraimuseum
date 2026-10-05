import { discoveryIds, type DiscoveryId } from "../data/discoveries";
export const SAVE_KEY = "mirai-museum:v1";
export interface Progress {
  version: 1;
  visits: Partial<Record<DiscoveryId, number>>;
  expeditions: number;
  muted: boolean;
}
export const emptyProgress = (): Progress => ({
  version: 1,
  visits: {},
  expeditions: 0,
  muted: false,
});
export function parseProgress(raw: string | null): Progress {
  if (!raw) return emptyProgress();
  try {
    const data = JSON.parse(raw);
    if (data?.version !== 1 || !data.visits || typeof data.visits !== "object")
      return emptyProgress();
    const result = emptyProgress();
    for (const id of discoveryIds) {
      const count = data.visits[id];
      if (Number.isSafeInteger(count) && count > 0)
        result.visits[id] = Math.min(count, 9999);
    }
    result.expeditions =
      Number.isSafeInteger(data.expeditions) && data.expeditions > 0
        ? data.expeditions
        : 0;
    result.muted = data.muted === true;
    return result;
  } catch {
    return emptyProgress();
  }
}
export function recordExpedition(
  progress: Progress,
  found: DiscoveryId[],
): Progress {
  const next: Progress = {
    ...progress,
    visits: { ...progress.visits },
    expeditions: progress.expeditions + 1,
  };
  for (const id of new Set(found)) {
    if (discoveryIds.includes(id)) next.visits[id] = (next.visits[id] ?? 0) + 1;
  }
  return next;
}
