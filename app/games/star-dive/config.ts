export const BPM = 144,
  DURATION = 80,
  BAR_SECONDS = (60 / BPM) * 4;
export const sections = [
  "dive",
  "first-contact",
  "asteroid-field",
  "risk",
  "inside",
  "break-out",
] as const;
export type Section = (typeof sections)[number];
export const sectionAt = (time: number): Section =>
  sections[Math.min(5, Math.max(0, Math.floor(time / (DURATION / 6))))]!;
export type TargetKind = "shard" | "core" | "gate";
export interface Entity {
  id: number;
  kind: TargetKind | "asteroid";
  x: number;
  y: number;
  z: number;
  born: number;
  hp: number;
  radius: number;
  nearRadius: number;
  minDistance: number;
  touched: boolean;
  passed: boolean;
}
export interface Projectile {
  id: number;
  x: number;
  y: number;
  z: number;
  age: number;
}
export type EventKind =
  | "hit"
  | "destroy"
  | "near"
  | "damage"
  | "gate"
  | "section"
  | "climax"
  | "discovery"
  | "shot";
export interface DiveEvent {
  id: number;
  kind: EventKind;
  time: number;
  x: number;
  y: number;
  z: number;
  points: number;
  big: boolean;
  label?: string;
}
export interface Snapshot {
  time: number;
  section: Section;
  shield: number;
  score: number;
  chain: number;
  maxChain: number;
  near: number;
  risk: number;
  gateOpen: boolean;
  finished: boolean;
  cleared: boolean;
  event?: DiveEvent;
  quality: string;
}
