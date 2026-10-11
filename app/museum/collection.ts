import { exhibits, type ExhibitId } from "./exhibits";
export const NAP_SAVE_KEY = "mirai-museum:naps:v1";
export interface NapRecord {
  id: ExhibitId;
  completedAt: string;
  visits: number;
}
export interface NapCollection {
  version: 1;
  naps: NapRecord[];
}
export const emptyCollection = (): NapCollection => ({ version: 1, naps: [] });
export function parseCollection(raw: string | null): NapCollection {
  const result = emptyCollection();
  try {
    const data = JSON.parse(raw || "null");
    if (data?.version !== 1 || !Array.isArray(data.naps)) return result;
    for (const n of data.naps) {
      if (
        !exhibits.some((e) => e.id === n?.id && e.available) ||
        result.naps.some((e) => e.id === n.id)
      )
        continue;
      if (
        typeof n.completedAt !== "string" ||
        !Number.isFinite(Date.parse(n.completedAt))
      )
        continue;
      if (!Number.isInteger(n.visits) || n.visits < 1 || n.visits > 999999)
        continue;
      result.naps.push({
        id: n.id,
        completedAt: n.completedAt,
        visits: n.visits,
      });
    }
  } catch {}
  return result;
}
export function recordNap(
  collection: NapCollection,
  id: ExhibitId,
  now = new Date().toISOString(),
): NapCollection {
  const next = parseCollection(JSON.stringify(collection));
  if (
    !exhibits.some((e) => e.id === id && e.available) ||
    !Number.isFinite(Date.parse(now))
  )
    return next;
  const old = next.naps.find((n) => n.id === id);
  if (old) {
    old.visits = Math.min(999999, old.visits + 1);
    old.completedAt = now;
  } else next.naps.push({ id, completedAt: now, visits: 1 });
  return next;
}
export function readCollection(
  storage: Pick<Storage, "getItem">,
): NapCollection {
  try {
    return parseCollection(storage.getItem(NAP_SAVE_KEY));
  } catch {
    return emptyCollection();
  }
}
export function saveCollection(
  storage: Pick<Storage, "setItem">,
  data: NapCollection,
): boolean {
  try {
    storage.setItem(NAP_SAVE_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}
