import * as THREE from "three";

interface FacetedMeshAsset {
  vertices: number[];
  faces: number[];
  colors: number[];
}

interface EarthAsset {
  version: number;
  surface: FacetedMeshAsset;
  clouds: FacetedMeshAsset;
}

function createFacetedMesh(asset: FacetedMeshAsset, name: string): THREE.Mesh {
  if (!Array.isArray(asset.vertices) || !Array.isArray(asset.faces) || !Array.isArray(asset.colors)
    || asset.vertices.length % 3 !== 0 || asset.faces.length % 3 !== 0
    || asset.colors.length !== asset.faces.length) {
    throw new Error("Invalid faceted Earth asset");
  }

  // Each face has its own color. Expand the compact indexed source once;
  // interpolation within a triangle stays flat, with no runtime texture reads.
  const positions = new Float32Array(asset.faces.length * 3);
  const colors = new Float32Array(asset.faces.length * 3);
  const color = new THREE.Color();
  for (let face = 0; face < asset.faces.length; face += 3) {
    color.setRGB(asset.colors[face]! / 255, asset.colors[face + 1]! / 255,
      asset.colors[face + 2]! / 255, THREE.SRGBColorSpace);
    for (let corner = 0; corner < 3; corner++) {
      const vertex = asset.faces[face + corner]! * 3;
      if (!Number.isInteger(vertex) || vertex < 0 || vertex + 2 >= asset.vertices.length) {
        throw new Error("Invalid faceted Earth vertex");
      }
      const offset = (face + corner) * 3;
      positions[offset] = asset.vertices[vertex]!;
      positions[offset + 1] = asset.vertices[vertex + 1]!;
      positions[offset + 2] = asset.vertices[vertex + 2]!;
      colors[offset] = color.r;
      colors[offset + 1] = color.g;
      colors[offset + 2] = color.b;
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geometry.computeBoundingSphere();
  const material = new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = name;
  return mesh;
}

/**
 * Radius-one Earth. Longitude zero faces +Z, north is +Y. The caller controls
 * its pose, renderer, atmosphere and lifecycle. XYZ yaw 100° / pitch 30° faces
 * the Americas and matches the server-rendered SVG poster.
 */
export async function loadLowPolyEarth(signal?: AbortSignal): Promise<THREE.Group> {
  const response = await fetch("/floating-earth/model.json", { signal });
  if (!response.ok) throw new Error("Could not load the faceted Earth");
  const asset = await response.json() as EarthAsset;
  if (asset.version !== 1 || !asset.surface || !asset.clouds) {
    throw new Error("Unsupported faceted Earth asset");
  }
  signal?.throwIfAborted();
  const earth = new THREE.Group();
  earth.name = "FloatingEarth";
  earth.add(createFacetedMesh(asset.surface, "EarthSurface"));
  try {
    earth.add(createFacetedMesh(asset.clouds, "RaisedClouds"));
  } catch (error) {
    earth.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.geometry.dispose();
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach((material) => material.dispose());
      }
    });
    throw error;
  }
  earth.userData.surfaceFacets = asset.surface.faces.length / 3;
  earth.userData.cloudFacets = asset.clouds.faces.length / 3;
  return earth;
}
