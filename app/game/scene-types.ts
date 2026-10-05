import type { DiscoveryId } from "../data/discoveries";
export interface GameState {
  phase: string;
  distance: number;
  found: DiscoveryId[];
  paused: boolean;
}
export interface SceneHooks {
  state: (state: GameState) => void;
  discover: (id: DiscoveryId) => void;
  cue: (message: string) => void;
  finish: (ids: DiscoveryId[]) => void;
}
