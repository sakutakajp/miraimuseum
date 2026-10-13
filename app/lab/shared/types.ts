export type EngineId = 'three' | 'babylon';
export type Quality = 'mobile' | 'balanced' | 'ultra';
export type ComparisonMode = 'fair' | 'maximum';
export type GameMode = 'diorama' | 'explore';
export interface Vec3 { x: number; y: number; z: number }
export interface CameraState { azimuth: number; elevation: number; radius: number; target: Vec3 }
export interface Settings { quality: Quality; comparison: ComparisonMode; night: boolean }
export interface Actor { position: Vec3; yaw: number; walking: boolean; phase: number }
export interface WorldState {
  time: number;
  mode: GameMode;
  player: Actor;
  residents: Actor[];
  fountain: boolean;
  celebration: number;
}
export interface FrameMetrics {
  engine: EngineId;
  version: string;
  fps: number;
  frameMs: number;
  drawCalls: number | null;
  triangles: number | null;
  textures: number | null;
  loadMs: number;
  resolution: string;
  quality: Quality;
  comparison: ComparisonMode;
  night: boolean;
  api: string;
}
export interface ScenePick { point: Vec3 }
export interface Adapter {
  engine: EngineId;
  version: string;
  initialize(canvas: HTMLCanvasElement, settings: Settings, progress: (label: string) => void): Promise<void>;
  resize(width: number, height: number, dpr: number): void;
  configure(settings: Settings): void;
  render(camera: CameraState, world: WorldState, dt: number): void;
  pick(x: number, y: number): ScenePick | null;
  project(point: Vec3): { x: number; y: number; visible: boolean };
  stats(): Pick<FrameMetrics, 'drawCalls' | 'triangles' | 'textures' | 'api'>;
  capture(): string;
  dispose(): void;
}
export interface Landmark {
  id: string; title: string; latin: string; category: string; description: string;
  fact: string; position: Vec3; bounds: { x: number; z: number; w: number; d: number };
}
export const QUALITY: Record<Quality, { dpr: number; shadow: number; ao: boolean; bloom: number }> = {
  mobile: { dpr: 1, shadow: 1024, ao: false, bloom: .14 },
  balanced: { dpr: 1.5, shadow: 2048, ao: true, bloom: .2 },
  ultra: { dpr: 2, shadow: 4096, ao: true, bloom: .27 },
};
export const CAMERA_FOV = 38 * Math.PI / 180;
export const CAMERA_INITIAL: CameraState = {
  azimuth: .70, elevation: .72, radius: 50, target: { x: 0, y: .4, z: -.7 },
};
// Shared portrait framing preserves the model's width on narrow touch screens.
export function projectionFov(aspect:number):number{return 2*Math.atan(Math.tan(CAMERA_FOV/2)*Math.max(1,1.35/aspect));}
export const ASSET_URL = '/lab/roman-town.glb';
export const ENVIRONMENT_URL = '/lab/roman-sky.hdr';
