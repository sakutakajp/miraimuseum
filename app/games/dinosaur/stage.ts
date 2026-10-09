import { STAGE_01 } from "../../game/dinosaur/levels/stage01";
import { distanceAt, DURATION } from "../../game/dinosaur/config/gameplay";
import type { Level, Obstacle } from "../../game/dinosaur/types";
export type PartId = "ground" | "rock" | "root" | "branch" | "falling" | "fern" | "triceratops" | "rex";
export interface Placement {
  id: string; modelId: PartId; position: readonly [number, number, number]; rotation: readonly [number, number, number]; size: readonly [number, number, number];
  collider?: { kind: "box"; width: number; height: number; inset: number }; triggerAt?: number;
}
export interface RunSection { id: string; start: number; end: number; placements: readonly Placement[] }
export interface RunStage {
  id: string; rules: Level; sections: readonly RunSection[];
  start: readonly [number, number, number]; goal: number; checkpoints: readonly number[];
  camera: { height: number; playerFraction: number; floorFraction: number }; lighting: { sun: readonly [number, number, number] }; music: { bpm: number; duration: number; stems: readonly string[] };
}
export const obstaclePlacement = (o: Obstacle): Placement => ({ id: o.id, modelId: o.kind, position: [o.x, o.height / 2, 0], rotation: [0, 0, 0], size: [o.width, o.height, 26], collider: { kind: "box", width: o.width, height: o.height, inset: o.kind === "branch" ? 6 : 3 }, triggerAt: o.at });
/** Existing six short authored sections compose Stage 1; layout has no rendering objects. */
export function defineRunStage(level: Level): RunStage {
  return {
    id: level.id, rules: level,
    sections: level.sections.map(section => ({ id: section.id, start: section.start, end: section.end, placements: level.obstacles.filter(o => o.x >= distanceAt(section.start) && o.x < distanceAt(section.end)).map(obstaclePlacement) })),
    start: [0, 0, 0], goal: distanceAt(DURATION), checkpoints: [],
    camera: { height: 800, playerFraction: 0.28, floorFraction: 0.755 }, lighting: { sun: [-0.3, -0.85, -0.4] }, music: { bpm: 150, duration: DURATION, stems: ["mineral", "pulse"] },
  };
}
export const DINOSAUR_STAGE_1 = defineRunStage(STAGE_01);
