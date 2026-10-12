import { Quaternion, Vector3 } from "@babylonjs/core";
export const INITIAL_EARTH_POSE = Quaternion.RotationAxis(Vector3.Right(), 12 * Math.PI / 180).multiply(Quaternion.RotationAxis(Vector3.Up(), 100 * Math.PI / 180));
const localNormal = (x: number, y: number, z: number) => new Vector3(x, y, z).normalize().applyRotationQuaternion(INITIAL_EARTH_POSE.conjugate());
export const DINOSAUR = { id: "dinosaur", modelUrl: "/floating-earth/dinosaur.glb", size: 0.5616, surfaceOffset: 0.008, normal: localNormal(0.32, 0.82, 0.48), yaw: -Math.PI / 3 };
const carNormal = localNormal(-0.85, 0.3, 0.65);
export const CYBERTRUCK = { id: "cybertruck", modelUrl: "/floating-earth/cybertruck.glb", size: DINOSAUR.size, surfaceOffset: 0.008,
  orbitSpeed: 0.25, orbitAxis: DINOSAUR.normal, initialNormal: carNormal.subtract(DINOSAUR.normal.scale(Vector3.Dot(carNormal, DINOSAUR.normal))).normalize(), yaw: Math.PI / 2 };
export const STATUE = { id: "statue", modelUrl: "/floating-earth/statue-of-liberty-optimized.glb", size: DINOSAUR.size, surfaceOffset: 0.008, normal: localNormal(-0.5, 0.8, 0.32), yaw: 0 };
export const EARTH_DISPLAY_EXTENT = 1.52;
export const EARTH_VIEW_EXTENT = 1 + DINOSAUR.size + DINOSAUR.surfaceOffset + 0.08;
export function surfaceOrientation(normal: Vector3) {
  const axis = Vector3.Cross(Vector3.Up(), normal);
  return axis.lengthSquared() < 1e-9 ? Quaternion.Identity() : Quaternion.RotationAxis(axis.normalize(), Math.acos(Math.max(-1, Math.min(1, normal.y))));
}
