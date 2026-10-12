import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { VertexData } from "@babylonjs/core/Meshes/mesh.vertexData";
import type { Scene } from "@babylonjs/core/scene";

/** A shared, texture-free stone shape with cut corners and a narrow bevel on both faces. */
export function cutStone(name: string, width: number, height: number, depth: number, scene: Scene): Mesh {
  const bevel = Math.min(width, height, depth) * 0.13;
  const positions: number[] = [];
  const indices: number[] = [];
  for (let layer = 0; layer < 4; layer++) {
    const inset = layer === 0 || layer === 3 ? bevel : 0;
    const x = width / 2 - inset, z = depth / 2 - inset;
    const corner = Math.min(width, depth) * .045;
    const y = [-height / 2, -height / 2 + bevel, height / 2 - bevel, height / 2][layer]!;
    for (const [px, pz] of [[-x + corner, -z], [x - corner, -z], [x, -z + corner], [x, z - corner], [x - corner, z], [-x + corner, z], [-x, z - corner], [-x, -z + corner]]) positions.push(px!, y, pz!);
  }
  for (let layer = 0; layer < 3; layer++) for (let side = 0; side < 8; side++) {
    const a = layer * 8 + side, b = layer * 8 + (side + 1) % 8, c = b + 8, d = a + 8;
    indices.push(a, c, b, a, d, c);
  }
  for (let i = 1; i < 7; i++) indices.push(0, i, i + 1, 24, 24 + i + 1, 24 + i);
  const normals: number[] = [];
  VertexData.ComputeNormals(positions, indices, normals);
  const data = new VertexData();
  data.positions = positions; data.indices = indices; data.normals = normals;
  data.uvs = Array(positions.length / 3 * 2).fill(0);
  const mesh = new Mesh(name, scene);
  data.applyToMesh(mesh);
  mesh.convertToFlatShadedMesh();
  return mesh;
}
