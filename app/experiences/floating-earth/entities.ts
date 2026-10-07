import { Euler, Object3D, Quaternion, Vector3 } from "three";

export interface FloatingEarthEntityDefinition {
  id: string;
  modelUrl: string;
  targetRoute: string;
  size: number;
  surfaceOffset: number;
  normal: Vector3;
  modelRotation: Euler;
}

const initialEarthPose = new Quaternion().setFromEuler(new Euler(
  12 * Math.PI / 180, 100 * Math.PI / 180, 0, "XYZ",
));

export const DINOSAUR: FloatingEarthEntityDefinition = {
  id: "dinosaur",
  modelUrl: "/floating-earth/dinosaur.glb",
  targetRoute: "/dinosaur",
  size: 0.10,
  surfaceOffset: 0.008,
  // Define the discovery point in the globe's local coordinates.
  normal: new Vector3(0.42, 0.72, 0.55).normalize().applyQuaternion(initialEarthPose.invert()),
  modelRotation: new Euler(0, -Math.PI / 3, 0),
};

/** Position an entity's feet on the logical sphere without modifying its visual. */
export function placeOnSphere(root: Object3D, normal: Vector3, radius: number, offset: number) {
  const outward = normal.clone().normalize();
  root.position.copy(outward).multiplyScalar(radius + offset);
  root.quaternion.setFromUnitVectors(new Vector3(0, 1, 0), outward);
}
