export type SectionId =
  | "calm"
  | "herd"
  | "predator"
  | "flash"
  | "fallout"
  | "boundary";
export type Rank = "S" | "A" | "B" | "C";
export interface Section {
  id: SectionId;
  name: string;
  start: number;
  end: number;
}
export interface Obstacle {
  id: string;
  x: number;
  width: number;
  height: number;
  kind: "rock" | "root" | "branch" | "falling";
  at?: number;
}
export interface SpeedCue {
  at: number;
  multiplier: number;
  ramp?: boolean;
}
export interface TerrainSegment {
  id: string;
  start: number;
  end: number;
  y: number;
  gap?: boolean;
  collapseAt?: number;
}
export interface Challenge {
  id: string;
  at: number;
}
export interface Cue {
  id: string;
  beat: number;
  type: "dinosaur" | "camera" | "visual" | "audio";
  value: string;
}
export interface Level {
  id: string;
  speeds: readonly SpeedCue[];
  sections: readonly Section[];
  obstacles: readonly Obstacle[];
  terrain: readonly TerrainSegment[];
  challenges: readonly Challenge[];
  cues: readonly Cue[];
}
export interface ClearResult {
  stageId: string;
  progress: number;
  score: number;
  sync: number;
  rank: Rank;
  attempts: number;
}
export interface DeepTimeRecord {
  bestProgress: number;
  bestClearScore: number;
  bestSync: number;
  bestRank?: Rank;
  cleared: boolean;
  attempts: number;
}
export type RunMode =
  | "ready"
  | "starting"
  | "running"
  | "dead"
  | "paused"
  | "complete";
export type UIAction =
  | "start"
  | "pause"
  | "resume"
  | "mute"
  | "retry"
  | "leave";
export interface ControlRect {
  action: UIAction;
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
}
export interface HostHooks {
  ready(): void;
  started(): void;
  best(record: DeepTimeRecord): void;
  paused(value: boolean): void;
  failed(progress: number): void;
  cleared(result: ClearResult): void;
  leave(): void;
  fatal(error: unknown): void;
  controls(rects: ControlRect[]): void;
  mode(value: RunMode): void;
}
