import { DEEP_TIME_SAVE_KEY, parseRecord } from "../../game/dinosaur/systems/records";
import { GAME_SAVE_KEY, parseGameProgress } from "../../games/progress";

export type CybertruckEntry = "locked" | "reveal" | "visible";

/** Existing clear records persist the reward; appearances last for this visit. */
export function createCybertruckUnlock() {
  let unlocked = false;
  let appeared = false;
  return {
    entry(read: (key: string) => string | null): CybertruckEntry {
      try { unlocked ||= parseRecord(read(DEEP_TIME_SAVE_KEY)).cleared; } catch {}
      try {
        unlocked ||= Object.values(parseGameProgress(read(GAME_SAVE_KEY))["dinosaur-run"].stages)
          .some(stage => stage.cleared);
      } catch {}
      return !unlocked ? "locked" : appeared ? "visible" : "reveal";
    },
    cleared() { unlocked = true; },
    appeared() { if (unlocked) appeared = true; },
  };
}

// Used only by client lifecycle hooks: a full access gets a fresh appearance.
export const cybertruckUnlock = createCybertruckUnlock();
