import { BEAT_SECONDS, distanceAt, SPEED_CUES } from "../config/gameplay";
import type { Level, Obstacle, TerrainSegment, Cue } from "../types";
// Every challenge is a jump onset, written in the musical grid. No random hazards.
const beats = [
  4, 8, 12, 17, 22, 26, 30, 34, 38, 42, 46, 50, 54, 58, 61, 64, 67, 70, 73, 76,
  79, 82, 84, 87, 90, 93, 98, 102, 106, 110, 113, 116, 119, 122, 125, 129, 132,
  135, 138, 140, 142, 145, 148, 150, 152, 155, 158, 161, 168, 176,
];
const gaps = new Set([50, 76, 113, 138, 150, 168]);
const steps = new Set([17, 42, 67, 90, 119, 145, 161]);
const terrain: TerrainSegment[] = [];
const obstacles: Obstacle[] = [];
for (const [i, beat] of beats.entries()) {
  const at = beat * BEAT_SECONDS;
  const x = distanceAt(at + 0.28);
  if (gaps.has(beat))
    terrain.push({
      id: `gap-${beat}`,
      start: x - 34,
      end: x + 48,
      y: 0,
      gap: true,
      collapseAt: beat >= 128 ? at - 0.4 : undefined,
    });
  else if (steps.has(beat))
    terrain.push({ id: `ledge-${beat}`, start: x - 25, end: x + 68, y: -18 });
  else
    obstacles.push({
      id: `obstacle-${beat}`,
      x,
      width: beat >= 129 ? 40 + (i % 3) * 6 : 27 + (i % 3) * 5,
      height: beat >= 129 ? 42 + (i % 3) * 5 : 26 + (i % 3) * 6,
      kind:
        beat >= 129 && i % 4 === 0
          ? "falling"
          : beat >= 129 && i % 4 === 1
            ? "branch"
            : i % 4 === 2
              ? "root"
              : "rock",
      at: at - 0.6,
    });
}
// Shallow footprints teach stepped surfaces without punitive blind gaps.
for (const beat of [35, 44, 56])
  terrain.push({
    id: `footprint-${beat}`,
    start: distanceAt(beat * BEAT_SECONDS),
    end: distanceAt(beat * BEAT_SECONDS) + 62,
    y: 8,
  });
const cue = (beat: number, type: Cue["type"], value: string): Cue => ({
  id: `${type}-${value}-${beat}`,
  beat,
  type,
  value,
});
const cues = [
  cue(0, "visual", "calm"),
  cue(0, "audio", "start"),
  cue(28, "dinosaur", "herd-far"),
  cue(32, "visual", "herd"),
  cue(36, "dinosaur", "herd-mid"),
  cue(44, "dinosaur", "herd-cross"),
  cue(64, "visual", "predator"),
  cue(64, "dinosaur", "rex-far"),
  cue(70, "dinosaur", "rex-mid"),
  cue(78, "dinosaur", "rex-pressure"),
  cue(78, "camera", "rex-pressure"),
  cue(78, "audio", "rex"),
  cue(84, "dinosaur", "rex-chase"),
  cue(96, "visual", "impact-flash"),
  cue(96, "camera", "impact"),
  cue(96, "audio", "impact"),
  cue(104, "dinosaur", "herd-flight"),
  cue(128, "visual", "fallout"),
  cue(137, "visual", "collapse"),
  cue(137, "audio", "rock"),
  cue(149, "visual", "collapse"),
  cue(149, "audio", "rock"),
  cue(160, "visual", "boundary"),
  cue(178, "visual", "safe-ending"),
  cue(184, "visual", "whiteout"),
  cue(188, "visual", "kp-boundary"),
  cue(192, "audio", "clear"),
].sort((a, b) => a.beat - b.beat);
export const STAGE_01: Level = {
  id: "cretaceous-last-day",
  speeds: SPEED_CUES,
  sections: ["calm", "herd", "predator", "flash", "fallout", "boundary"].map(
    (id, i) => ({
      id: id as Level["sections"][number]["id"],
      name: id.toUpperCase(),
      start: i * 12.8,
      end: (i + 1) * 12.8,
    }),
  ),
  obstacles: obstacles.sort((a, b) => a.x - b.x),
  terrain: terrain.sort((a, b) => a.start - b.start),
  challenges: beats.map((beat) => ({
    id: `jump-${beat}`,
    at: beat * BEAT_SECONDS,
  })),
  cues,
};
