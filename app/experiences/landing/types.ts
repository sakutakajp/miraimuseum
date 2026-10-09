export type LandingScene = "threshold" | "scale-shift" | "connected";
export type QualityTier = "high" | "medium" | "low" | "static";
export type CoreState = "SPACE" | "LIFE" | "MATTER" | "MACHINE" | "";
export interface LandingRuntimeState {
  globalProgress: number;
  scene: LandingScene;
  sceneProgress: number;
  scrollVelocity: number;
  pointerX: number;
  pointerY: number;
  pointerActive: boolean;
  viewportWidth: number;
  viewportHeight: number;
  dpr: number;
  reducedMotion: boolean;
  quality: QualityTier;
  elapsed: number;
  scrollVh: number;
  bone: number;
  coreState: CoreState;
}
export interface LandingVisual {
  update(state: LandingRuntimeState, delta: number): void;
  resize(state: LandingRuntimeState): void;
  dispose(): void;
}
