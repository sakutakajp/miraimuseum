export interface Vec {
  x: number;
  y: number;
}
export interface Circle extends Vec {
  radius: number;
}
export interface Planet extends Circle {
  mu: number;
  color: number;
}
export interface Shot {
  angle: number;
  speed: number;
}
export interface Stage {
  id: number;
  nameKey: string;
  board: { width: number; height: number };
  launch: Vec;
  planets: Planet[];
  obstacles: Circle[];
  destination: Circle;
  stars: Circle[];
  maxSpeed: number;
  maxTime: number;
  hintKey: string;
  parcelKey: string;
  references: { delivery: Shot; threeStars: Shot };
}
export type Mode =
  "ready" | "aiming" | "flying" | "success" | "failure" | "paused";
export interface Flight {
  position: Vec;
  velocity: Vec;
  time: number;
  collected: number[];
  outcome: "flying" | "success" | "failure";
  reason?: "collision" | "outside" | "timeout";
}
export interface FlightEvent {
  kind: "star" | "success" | "collision" | "outside" | "timeout";
  fraction: number;
  index?: number;
}
