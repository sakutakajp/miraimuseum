import { Box2, Box3, Camera, Mesh, Object3D, Raycaster, Vector2, Vector3 } from "three";

/** Match picking to the opaque Earth's depth, excluding clouds and aura shells. */
export function hitsVisibleEntity(ray: Raycaster, entity: Object3D, earth: Object3D) {
  if (!entity.visible) return false;
  const hit = ray.intersectObject(entity, true)[0];
  if (!hit) return false;
  const surface = ray.intersectObject(earth, true).find(({ object }) =>
    object instanceof Mesh && (Array.isArray(object.material) ? object.material : [object.material])
      .some(material => !material.transparent),
  );
  return !surface || hit.distance < surface.distance;
}

const pickOffsets = [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1],
  [0.7, 0.7], [-0.7, 0.7], [0.7, -0.7], [-0.7, -0.7]] as const;

/** A small screen-space tolerance makes the glowing edge and finger taps usable. */
export function picksVisibleEntity(ray: Raycaster, pointer: Vector2, tolerance: Vector2,
  camera: Camera, entity: Object3D, earth: Object3D) {
  const sample = new Vector2();
  for (const [x, y] of pickOffsets) {
    sample.set(pointer.x + x * tolerance.x, pointer.y + y * tolerance.y);
    ray.setFromCamera(sample, camera);
    if (hitsVisibleEntity(ray, entity, earth)) return true;
  }
  return false;
}

export function projectBounds(bounds: Box3, camera: Camera, target: Box2) {
  target.makeEmpty();
  const corner = new Vector3();
  for (const x of [bounds.min.x, bounds.max.x])
    for (const y of [bounds.min.y, bounds.max.y])
      for (const z of [bounds.min.z, bounds.max.z]) {
        corner.set(x, y, z).project(camera);
        target.min.x = Math.min(target.min.x, corner.x);
        target.min.y = Math.min(target.min.y, corner.y);
        target.max.x = Math.max(target.max.x, corner.x);
        target.max.y = Math.max(target.max.y, corner.y);
      }
  return target;
}
