import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { VertexData } from "@babylonjs/core/Meshes/mesh.vertexData";
import type { Scene } from "@babylonjs/core/scene";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import type { ImageCalibration } from "./calibration";
import type { LayerDefinition, Point } from "./types";

const cross = (a: Point, b: Point, c: Point) =>
  (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);

// Small, concave traced outlines do not justify adding a triangulation dependency.
export function triangulate(polygon: Point[]): number[] {
  const area = polygon.reduce((sum, p, i) => {
    const q = polygon[(i + 1) % polygon.length]!;
    return sum + p[0] * q[1] - q[0] * p[1];
  }, 0);
  const ids = polygon.map((_, i) => i);
  if (area < 0) ids.reverse();
  const triangles: number[] = [];
  const inside = (p: Point, a: Point, b: Point, c: Point) =>
    cross(a, b, p) >= -1e-7 && cross(b, c, p) >= -1e-7 && cross(c, a, p) >= -1e-7;
  let budget = ids.length ** 2;
  while (ids.length > 3 && budget-- > 0) {
    let found = false;
    for (let i = 0; i < ids.length; i++) {
      const a = ids[(i + ids.length - 1) % ids.length]!;
      const b = ids[i]!;
      const c = ids[(i + 1) % ids.length]!;
      if (Math.abs(cross(polygon[a]!, polygon[b]!, polygon[c]!)) < 1e-7) {
        ids.splice(i, 1); found = true; break;
      }
      if (cross(polygon[a]!, polygon[b]!, polygon[c]!) <= 0) continue;
      if (ids.some(j => j !== a && j !== b && j !== c && inside(polygon[j]!, polygon[a]!, polygon[b]!, polygon[c]!))) continue;
      triangles.push(a, b, c); ids.splice(i, 1); found = true; break;
    }
    if (!found) throw new Error("A mask polygon intersects itself; check nyc-layout.json.");
  }
  if (ids.length === 3) triangles.push(ids[0]!, ids[1]!, ids[2]!);
  return triangles;
}

function clipX(points: Point[], boundary: number, keepRight: boolean): Point[] {
  const result: Point[] = [];
  const inside = (p: Point) => keepRight ? p[0] >= boundary - 1e-6 : p[0] <= boundary + 1e-6;
  for (let i = 0; i < points.length; i++) {
    const a = points[i]!, b = points[(i + 1) % points.length]!;
    if (inside(a)) result.push(a);
    if (inside(a) !== inside(b)) {
      const t = (boundary - a[0]) / (b[0] - a[0]);
      result.push([boundary, a[1] + (b[1] - a[1]) * t]);
    }
  }
  return result.filter((p, i) => !i || Math.hypot(p[0] - result[i-1]![0], p[1] - result[i-1]![1]) > 1e-5);
}

function interpolate(line: Point[], x: number): number {
  const segment = line.findIndex((p, i) => i < line.length - 1 && x <= line[i + 1]![0]);
  const i = segment < 0 ? line.length - 2 : segment;
  const a = line[i]!, b = line[i + 1]!;
  return a[1] + (b[1] - a[1]) * (x - a[0]) / (b[0] - a[0]);
}

function silhouetteWidth(polygon: Point[], y: number): number {
  const intersections: number[] = [];
  const row = y + 0.15;
  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i]!, b = polygon[(i + 1) % polygon.length]!;
    if ((a[1] > row) !== (b[1] > row)) intersections.push(a[0] + (b[0] - a[0]) * (row - a[1]) / (b[1] - a[1]));
  }
  return intersections.length < 2 ? 1 : Math.max(...intersections) - Math.min(...intersections);
}

function makeMesh(name: string, points: Vector3[], indices: number[], scene: Scene, uvs?: number[]) {
  const mesh = new Mesh(name, scene);
  const data = new VertexData();
  data.positions = points.flatMap(p => [p.x, p.y, p.z]);
  data.indices = indices;
  const normals: number[] = [];
  VertexData.ComputeNormals(data.positions, indices, normals);
  data.normals = normals;
  if (uvs) data.uvs = uvs;
  data.applyToMesh(mesh);
  return mesh;
}

/** Fold traced visible facades along their ground-line corners, then close the
 * volume behind them. Every front vertex lies on its original projector ray.
 * This is single-view geometry inference, not a measured architectural model. */
export function createProjectedRelief(layer: LayerDefinition, polygon: Point[], line: Point[], calibration: ImageCalibration, scene: Scene, name: string): Mesh[] {
  const boundaries = [-Infinity, ...line.slice(1, -1).map(p => p[0]), Infinity];
  const meshes: Mesh[] = [];
  for (let s = 0; s < boundaries.length - 1; s++) {
    let part = polygon;
    if (Number.isFinite(boundaries[s]!)) part = clipX(part, boundaries[s]!, true);
    if (Number.isFinite(boundaries[s+1]!)) part = clipX(part, boundaries[s+1]!, false);
    if (part.length < 3) continue;
    const area = part.reduce((sum, p, i) => sum + cross([0, 0], p, part[(i+1)%part.length]!), 0);
    if (Math.abs(area) < 0.05) continue;
    const front = part.map(p => calibration.onHeight(p,
      calibration.layout.calibration.baseTop + (interpolate(line, p[0]) - p[1]) / calibration.verticalPixelsPerUnit));
    // A four-pixel antenna must not inherit the depth of the whole tower.
    const back = front.map((p, i) => p.subtract(calibration.towardCamera.scale(
      Math.min(layer.extrusion ?? 0.2, silhouetteWidth(polygon, part[i]![1]) / calibration.pixelsPerUnit * 0.55))));
    const n = front.length;
    let face = triangulate(part);
    const normal = Vector3.Cross(front[face[1]!]!.subtract(front[face[0]!]!), front[face[2]!]!.subtract(front[face[0]!]!));
    // Babylon's left-handed winding has its normal opposite the right-handed cross.
    if (Vector3.Dot(normal, calibration.towardCamera) > 0) {
      face = face.flatMap((_, i, all) => i % 3 === 0 ? [all[i]!, all[i+2]!, all[i+1]!] : []);
    }
    const indices = [...face];
    for (let i = 0; i < face.length; i += 3) indices.push(face[i]! + n, face[i+2]! + n, face[i+1]! + n);
    // Duplicate cap vertices so silhouette edges stay sharp rather than averaged.
    const vertices = [...front, ...back];
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n, offset = vertices.length;
      vertices.push(front[i]!, front[j]!, back[j]!, back[i]!);
      indices.push(offset, offset+1, offset+2, offset, offset+2, offset+3);
    }
    meshes.push(makeMesh(`${name}-${s}`, vertices, indices, scene));
  }
  return meshes;
}

export function createGroundPolygon(name: string, polygon: Point[], calibration: ImageCalibration, scene: Scene): Mesh {
  const points = polygon.map(p => calibration.onHeight(p, calibration.layout.calibration.baseTop + 0.008));
  let indices = triangulate(polygon);
  const normal = Vector3.Cross(points[indices[1]!]!.subtract(points[indices[0]!]!), points[indices[2]!]!.subtract(points[indices[0]!]!));
  if (Vector3.Dot(normal, calibration.towardCamera) > 0) {
    indices = indices.flatMap((_, i, all) => i % 3 === 0 ? [all[i]!, all[i+2]!, all[i+1]!] : []);
  }
  return makeMesh(name, points, indices, scene);
}

export function createImageCard(name: string, bounds: [number, number, number, number], depth: number, calibration: ImageCalibration, scene: Scene): Mesh {
  const [left, top, right, bottom] = bounds;
  const points: Point[] = [[left, top], [right, top], [right, bottom], [left, bottom]];
  return makeMesh(name, points.map(p => calibration.onDepth(p, depth)), [0, 2, 1, 0, 3, 2], scene, [0, 0, 1, 0, 1, 1, 0, 1]);
}
