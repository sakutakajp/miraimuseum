export type Point = [number, number];
export type DioramaMode = "original" | "projection" | "parallax";
export interface CameraState { yaw: number; pitch: number; zoom: number }
export interface CameraLimits { yaw: number; pitch: number }
export interface LayerDefinition {
  id: string;
  label: string;
  kind: "base" | "ground" | "building" | "foliage" | "bridge" | "boat" | "detail";
  depth: number;
  color: string;
  polygons: Point[][];
  groundLines?: Point[][];
  extrusion?: number;
}
export interface DioramaLayout {
  version: number;
  source: string;
  imageSize: Point;
  calibration: {
    baseLeft: Point; baseFront: Point; baseRight: Point;
    baseSize: number; baseTop: number; baseThickness: number; distance: number;
  };
  camera: { yawLimit: number; pitchLimit: number; zoomMin: number; zoomMax: number };
  parallax: { depthScale: number };
  rendering: { desktopDpr: number; mobileDpr: number; lowCoreDpr: number };
  layers: LayerDefinition[];
}
export interface LayerAsset {
  id: string; file: string; bounds: [number, number, number, number]; wirePolygons: Point[][];
}
export interface AssetManifest { imageSize: Point; sourceSha256: string; layers: LayerAsset[] }
