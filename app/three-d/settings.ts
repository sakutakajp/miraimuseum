export type Quality = "high" | "medium" | "low";
export interface Settings { volume: number; muted: boolean; quality: Quality }
export const SETTINGS_KEY = "mirai-museum:settings:v1";
export const defaultSettings: Settings = { volume: 0.8, muted: false, quality: "high" };
export function parseSettings(raw: string | null): Settings {
  try {
    const v = JSON.parse(raw || "{}");
    return { volume: typeof v?.volume === "number" && Number.isFinite(v.volume) ? Math.max(0, Math.min(1, v.volume)) : 0.8,
      muted: v?.muted === true, quality: ["low", "medium", "high"].includes(v?.quality) ? v.quality : "high" };
  } catch { return { ...defaultSettings }; }
}
export function readSettings(): Settings {
  try { const current = localStorage.getItem(SETTINGS_KEY); if (current) return parseSettings(current);
    const old = JSON.parse(localStorage.getItem("mirai-museum:v1") || "{}");
    return { ...defaultSettings, muted: old?.muted === true }; } catch { return { ...defaultSettings }; }
}
export function saveSettings(settings: Settings) {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); return true; } catch { return false; }
}
export const qualityProfile = {
  high: { pixelRatio: 1.75, shadows: true, decorations: 30 },
  medium: { pixelRatio: 1.25, shadows: false, decorations: 18 },
  low: { pixelRatio: 1, shadows: false, decorations: 8 },
} as const;
