import * as T from "three";
import type { TargetKind } from "../config";

// Shared by the live scene and Storybook. Geometry is deliberately stylized,
// with emissive details above bloom threshold and opaque PBR hull surfaces.
export function makeShip(segments = 16) {
  const root = new T.Group();
  const hull = new T.MeshStandardMaterial({
    color: "#eaf5fa",
    metalness: 0.65,
    roughness: 0.3,
  });
  const dark = new T.MeshStandardMaterial({
    color: "#162b45",
    metalness: 0.7,
    roughness: 0.3,
  });
  const cyan = new T.MeshStandardMaterial({
    color: "#14485a",
    emissive: "#28cfff",
    emissiveIntensity: 1.4,
    metalness: 0.5,
    roughness: 0.15,
  });
  const warm = new T.MeshStandardMaterial({
    color: "#ffa46b",
    emissive: "#ff6231",
    emissiveIntensity: 0.45,
  });
  const mesh = (
    geometry: T.BufferGeometry,
    material: T.Material,
    x: number,
    y: number,
    z: number,
  ) => {
    const part = new T.Mesh(geometry, material);
    part.position.set(x, y, z);
    root.add(part);
    return part;
  };
  const body = mesh(new T.ConeGeometry(0.38, 1.75, 8), hull, 0, 0, -0.1);
  body.rotation.x = -Math.PI / 2;
  body.scale.z = 0.45;
  const canopy = mesh(
    new T.SphereGeometry(0.24, segments, Math.max(4, segments / 2)),
    cyan,
    0,
    0.17,
    -0.2,
  );
  canopy.scale.set(0.8, 0.65, 1.7);
  mesh(new T.BoxGeometry(0.16, 0.06, 0.42), dark, 0, 0.25, 0.42);
  mesh(new T.BoxGeometry(0.05, 0.07, 0.36), warm, 0, 0.26, 0.44);
  const muzzle = mesh(new T.SphereGeometry(0.095, 6, 4), cyan, 0, 0, -0.98);
  muzzle.name = "muzzle";
  for (const side of [-1, 1]) {
    const shape = new T.Shape();
    shape.moveTo(0, 0);
    shape.lineTo(0.8, -0.32);
    shape.lineTo(1, 0.45);
    shape.lineTo(0, 0.3);
    shape.closePath();
    const wing = mesh(
      new T.ExtrudeGeometry(shape, { depth: 0.08, bevelEnabled: false }),
      hull,
      side * 0.2,
      -0.06,
      0.35,
    );
    wing.rotation.x = Math.PI / 2;
    wing.scale.x = side;
    mesh(new T.BoxGeometry(0.08, 0.11, 0.55), warm, side * 0.85, 0, 0.32);
    const engine = mesh(
      new T.CylinderGeometry(0.15, 0.19, 0.65, segments),
      dark,
      side * 0.43,
      -0.12,
      0.55,
    );
    engine.rotation.x = Math.PI / 2;
    const exhaust = mesh(
      new T.ConeGeometry(0.12, 1.3, 10),
      cyan,
      side * 0.43,
      -0.12,
      1.5,
    );
    exhaust.rotation.x = Math.PI / 2;
    exhaust.name = "exhaust";
  }
  return root;
}

export function makeTarget(kind: TargetKind) {
  const root = new T.Group();
  const color =
    kind === "shard" ? "#b3ff6e" : kind === "core" ? "#52edff" : "#ffd69b";
  const glow = new T.MeshStandardMaterial({
    color: new T.Color(color).multiplyScalar(0.25),
    emissive: color,
    emissiveIntensity: 1.3,
    metalness: 0.5,
    roughness: 0.22,
  });
  const shell = new T.MeshStandardMaterial({
    color: "#214761",
    metalness: 0.85,
    roughness: 0.25,
  });
  const center = new T.Mesh(
    new T.OctahedronGeometry(kind === "shard" ? 0.33 : 0.42),
    glow,
  );
  root.add(center);
  if (kind !== "shard") {
    for (let i = 0; i < (kind === "gate" ? 3 : 2); i++) {
      const ring = new T.Mesh(
        new T.TorusGeometry(0.6 + i * 0.07, 0.055, 6, 20),
        i === 0 ? glow : shell,
      );
      ring.rotation.set(i * 0.8, i * 0.6, 0.4);
      root.add(ring);
    }
  }
  return root;
}

export function disposeObject(root: T.Object3D) {
  const geometries = new Set<T.BufferGeometry>(),
    materials = new Set<T.Material>();
  root.traverse((object) => {
    if (
      object instanceof T.Mesh ||
      object instanceof T.Points ||
      object instanceof T.LineSegments
    ) {
      geometries.add(object.geometry);
      for (const material of Array.isArray(object.material)
        ? object.material
        : [object.material])
        materials.add(material);
    }
  });
  geometries.forEach((g) => g.dispose());
  materials.forEach((m) => m.dispose());
}
