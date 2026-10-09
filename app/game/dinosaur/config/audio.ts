export const MUSIC_STEMS = ["mineral", "pulse"] as const;
export const SOUND_NAMES = [
  "jump",
  "land",
  "death",
  "step",
  "rock",
  "rex",
  "impact",
  "ui",
  "clear",
] as const;
export type SoundName = (typeof SOUND_NAMES)[number];
