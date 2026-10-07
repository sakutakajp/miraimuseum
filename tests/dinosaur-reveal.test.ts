import { afterEach, describe, expect, it, vi } from "vitest";
import {
  Box2, Box3, BoxGeometry, Euler, Group, Mesh, MeshStandardMaterial,
  OrthographicCamera, Points, Quaternion, Raycaster, SphereGeometry, Vector3,
} from "three";
import { GLTFLoader, type GLTF } from "three/addons/loaders/GLTFLoader.js";
import { DINOSAUR, EARTH_VIEW_EXTENT, placeOnSphere } from "../app/experiences/floating-earth/entities";
import { loadDinosaurModel } from "../app/experiences/floating-earth/DinosaurModel";
import { DinosaurReveal, revealAt } from "../app/experiences/floating-earth/DinosaurReveal";
import { disposeEarthObjects } from "../app/experiences/floating-earth/model";
import { hitsVisibleEntity, projectBounds } from "../app/experiences/floating-earth/selection";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const missingAsset = () => vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
  new Response(null, { status: 404 }),
));

describe("dinosaur introduction timing", () => {
  it("leaves the Earth alone before showing light ahead of the dinosaur", () => {
    for (const time of [0, 0.5, 1]) {
      const frame = revealAt(time, false);
      expect(frame.phase).toBe("waiting");
      expect(frame.opacity).toBe(0);
      expect(frame.light).toBe(0);
    }
    const discovery = revealAt(1.6, false);
    expect(discovery.phase).toBe("light");
    expect(discovery.light).toBeGreaterThan(0);
    expect(discovery.opacity).toBe(0);
    const appearance = revealAt(2.4, false);
    expect(appearance.phase).toBe("revealing");
    expect(appearance.opacity).toBeGreaterThan(0);
    expect(appearance.opacity).toBeLessThan(1);
    expect(appearance.scale).toBeLessThan(1);
  });

  it("converges to a fully visible, stationary dinosaur with faint permanent afterglow", () => {
    const peak = revealAt(2.4, false);
    const settled = revealAt(3.5, false);
    expect(settled.phase).toBe("settled");
    expect(settled.opacity).toBe(1);
    expect(settled.scale).toBe(1);
    expect(settled.light).toBeGreaterThan(0);
    expect(settled.light).toBeLessThan(peak.light / 5);
    expect(revealAt(30, false)).toEqual(settled);
  });

  it("uses a short light-first fade without scaling for reduced motion", () => {
    expect(revealAt(0.3, true).opacity).toBe(0);
    expect(revealAt(0.5, true).light).toBeGreaterThan(0);
    expect(revealAt(0.5, true).opacity).toBe(0);
    for (const time of [0, 0.5, 0.75, 1.2, 10]) {
      expect(revealAt(time, true).scale).toBe(1);
    }
    expect(revealAt(1.2, true).phase).toBe("settled");
    expect(revealAt(1.2, true).opacity).toBe(1);
    expect(revealAt(1.2, false).opacity).toBe(0);
  });
});

describe("surface entity placement", () => {
  it("places feet above the logical sphere with local up aligned to its normal", () => {
    const root = new Group();
    const normal = new Vector3(3, 4, -2);
    const original = normal.clone();
    placeOnSphere(root, normal, 1, 0.008);
    expect(root.position.length()).toBeCloseTo(1.008, 10);
    expect(root.position.clone().normalize().distanceTo(normal.clone().normalize())).toBeLessThan(1e-10);
    expect(new Vector3(0, 1, 0).applyQuaternion(root.quaternion).distanceTo(normal.clone().normalize())).toBeLessThan(1e-10);
    expect(normal).toEqual(original);
  });

  it("keeps the entity and its light attached to Earth rotation and behind Earth after a half-turn", () => {
    const pose = new Group();
    pose.rotation.copy(new Euler(12 * Math.PI / 180, 100 * Math.PI / 180, 0, "XYZ"));
    const earthRotation = new Group();
    earthRotation.add(pose);
    const reveal = new DinosaurReveal();
    pose.add(reveal.object3D);
    earthRotation.updateMatrixWorld(true);
    const entityBefore = reveal.entityRoot.getWorldPosition(new Vector3());
    const effectsBefore = reveal.effectRoot.getWorldPosition(new Vector3());
    expect(entityBefore.distanceTo(effectsBefore)).toBeLessThan(1e-10);
    expect(entityBefore.z).toBeGreaterThan(0);
    reveal.updateVisibility(new Vector3(0, 0, -1));
    expect(reveal.object3D.visible).toBe(true);
    earthRotation.rotation.y = Math.PI;
    earthRotation.updateMatrixWorld(true);
    const entityAfter = reveal.entityRoot.getWorldPosition(new Vector3());
    const effectsAfter = reveal.effectRoot.getWorldPosition(new Vector3());
    const expected = entityBefore.clone().applyQuaternion(new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), Math.PI));
    expect(entityAfter.distanceTo(expected)).toBeLessThan(1e-10);
    expect(entityAfter.distanceTo(effectsAfter)).toBeLessThan(1e-10);
    expect(entityAfter.length()).toBeCloseTo(1 + DINOSAUR.surfaceOffset, 10);
    expect(entityAfter.z).toBeLessThan(0);
    reveal.updateVisibility(new Vector3(0, 0, -1));
    expect(reveal.object3D.visible).toBe(false);
    reveal.dispose();
  });

  it("accepts the front limb with orthographic rays and safely checks a detached entity", () => {
    const reveal = new DinosaurReveal();
    const cameraForward = new Vector3(0, 0, -1);
    placeOnSphere(reveal.object3D, new Vector3(1, 0, 0.01), 1, DINOSAUR.surfaceOffset);
    expect(reveal.object3D.parent).toBeNull();
    expect(reveal.isFrontFacing(cameraForward)).toBe(true);
    const rotation = new Group();
    rotation.add(reveal.object3D);
    rotation.rotation.y = Math.PI;
    expect(reveal.isFrontFacing(cameraForward)).toBe(false);
    reveal.dispose();
    expect(() => reveal.isFrontFacing(cameraForward)).not.toThrow();
  });

  it("keeps the complete resized silhouette inside the canvas through every rotation", () => {
    const camera = new OrthographicCamera(-EARTH_VIEW_EXTENT, EARTH_VIEW_EXTENT, EARTH_VIEW_EXTENT, -EARTH_VIEW_EXTENT, 0.1, 20);
    camera.position.z = 5;
    camera.updateMatrixWorld(true);
    const rotation = new Group(), anchor = new Group();
    placeOnSphere(anchor, DINOSAUR.normal, 1, DINOSAUR.surfaceOffset);
    rotation.add(anchor);
    const d = DINOSAUR.size;
    const local = new Box3(new Vector3(-d / 2, 0, -d / 2), new Vector3(d / 2, d, d / 2));
    const projected = new Box2();
    for (let yaw = 0; yaw < Math.PI * 2; yaw += Math.PI / 24) {
      for (const pitch of [-0.9, -0.45, 0, 0.45, 0.9]) {
        rotation.rotation.set(pitch, yaw, 0, "YXZ");
        rotation.position.y = 0.022;
        rotation.updateMatrixWorld(true);
        projectBounds(local.clone().applyMatrix4(anchor.matrixWorld), camera, projected);
        expect(Math.max(Math.abs(projected.min.x), Math.abs(projected.max.x), Math.abs(projected.min.y), Math.abs(projected.max.y))).toBeLessThan(1);
      }
    }
  });
});

describe("dinosaur selection", () => {
  it("selects real geometry in front of Earth, ignores the aura, and rejects occluded or hidden geometry", () => {
    const earth = new Group();
    earth.add(new Mesh(new SphereGeometry(1, 24, 16), new MeshStandardMaterial()));
    earth.add(new Mesh(new SphereGeometry(1.12, 24, 16), new MeshStandardMaterial({ transparent: true })));
    const entity = new Group();
    const model = new Mesh(new BoxGeometry(0.12, 0.12, 0.12), new MeshStandardMaterial());
    const aura = new Mesh(new SphereGeometry(0.3), new MeshStandardMaterial({ transparent: true }));
    aura.raycast = () => {};
    entity.add(model, aura);
    const ray = new Raycaster(new Vector3(0, 0, 5), new Vector3(0, 0, -1));
    entity.position.z = 1.1;
    earth.updateMatrixWorld(true);
    entity.updateMatrixWorld(true);
    expect(hitsVisibleEntity(ray, entity, earth)).toBe(true);
    const miss = new Raycaster(new Vector3(0.15, 0, 5), new Vector3(0, 0, -1));
    expect(hitsVisibleEntity(miss, entity, earth)).toBe(false);
    entity.position.z = -1.1;
    entity.updateMatrixWorld(true);
    expect(hitsVisibleEntity(ray, entity, earth)).toBe(false);
    entity.position.z = 1.1;
    entity.visible = false;
    entity.updateMatrixWorld(true);
    expect(hitsVisibleEntity(ray, entity, earth)).toBe(false);
    disposeEarthObjects(earth);
    disposeEarthObjects(entity);
  });
});

describe("optional dinosaur asset", () => {
  it("uses a small upright placeholder when the GLB returns 404", async () => {
    missingAsset();
    const model = await loadDinosaurModel(new AbortController().signal);
    expect(model.source).toBe("placeholder");
    expect(fetch).toHaveBeenCalledWith("/floating-earth/dinosaur.glb", expect.objectContaining({ signal: expect.any(AbortSignal) }));
    const bounds = new Box3().setFromObject(model.object3D, true);
    const size = bounds.getSize(new Vector3());
    expect(Math.max(size.x, size.y, size.z)).toBeCloseTo(DINOSAUR.size, 8);
    expect(bounds.min.y).toBeCloseTo(0, 8);
    expect(bounds.getCenter(new Vector3()).x).toBeCloseTo(0, 8);
    expect(bounds.getCenter(new Vector3()).z).toBeCloseTo(0, 8);
    expect(model.materials.length).toBeGreaterThan(0);
    expect(model.materials.every(material => material.depthTest)).toBe(true);
    disposeEarthObjects(model.object3D);
  });

  it("keeps the placeholder hidden until the light-first reveal, then settles without movement", async () => {
    missingAsset();
    const reveal = new DinosaurReveal();
    await reveal.load();
    expect(reveal.visible).toBe(false);
    expect(reveal.effectRoot.visible).toBe(false);
    reveal.update(1.6, false, 1);
    expect(reveal.state).toBe("light");
    expect(reveal.visible).toBe(false);
    expect(reveal.effectRoot.visible).toBe(true);
    reveal.update(0.8, false, 1);
    expect(reveal.visible).toBe(true);
    reveal.update(1.2, false, 1);
    expect(reveal.state).toBe("settled");
    const appearance = reveal.entityRoot.children[0]!;
    const transform = [appearance.position.toArray(), appearance.scale.toArray(), appearance.quaternion.toArray()];
    reveal.update(10, false, 1);
    expect([appearance.position.toArray(), appearance.scale.toArray(), appearance.quaternion.toArray()]).toEqual(transform);
    reveal.object3D.traverse(object => {
      if (!(object instanceof Mesh) && !(object instanceof Points)) return;
      for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
        expect(material.depthTest).toBe(true);
        if (material instanceof MeshStandardMaterial) {
          expect(material.opacity).toBe(1);
          expect(material.depthWrite).toBe(true);
        }
      }
    });
    reveal.dispose();
  });

  it("raises a white light column before the dinosaur, then lets the column fade away", async () => {
    missingAsset();
    const reveal = new DinosaurReveal();
    await reveal.load();
    const column = reveal.effectRoot.getObjectByName("DinosaurLightColumn") as Mesh;
    reveal.update(1.45, false, 1);
    expect(reveal.visible).toBe(false);
    expect(column.visible).toBe(true);
    const height = column.scale.y;
    expect(height).toBeGreaterThan(0);
    expect(height).toBeLessThan(1);
    reveal.update(0.4, false, 1);
    expect(column.scale.y).toBeGreaterThan(height);
    expect(reveal.visible).toBe(false);
    reveal.update(0.4, false, 1);
    expect(column.scale.y).toBe(1);
    expect(reveal.visible).toBe(true);
    reveal.update(1.3, false, 1);
    expect(column.visible).toBe(false);
    expect(reveal.effectRoot.visible).toBe(true);
    reveal.dispose();
  });

  it("avoids particle sparkle, scaling and rising in reduced motion", async () => {
    missingAsset();
    const reveal = new DinosaurReveal();
    await reveal.load();
    reveal.update(0.75, true, 2);
    expect(reveal.visible).toBe(true);
    const appearance = reveal.entityRoot.children[0]!;
    expect(appearance.position.y).toBe(0);
    expect(appearance.scale).toEqual(new Vector3(1, 1, 1));
    const sparkles = reveal.effectRoot.children.filter(object => object instanceof Points);
    expect(sparkles.length).toBeGreaterThan(0);
    expect(sparkles.every(object => !object.visible)).toBe(true);
    expect(reveal.effectRoot.getObjectByName("DinosaurLightColumn")!.visible).toBe(false);
    reveal.update(0.5, true, 2);
    expect(reveal.state).toBe("settled");
    expect(appearance.position.y).toBe(0);
    reveal.dispose();
  });

  it("retains a short fade for reduced motion even when the optional model arrives late", async () => {
    missingAsset();
    const reveal = new DinosaurReveal();
    reveal.update(5, true, 1);
    await reveal.load();
    reveal.update(0.05, true, 1);
    expect(reveal.state).not.toBe("settled");
    reveal.object3D.traverse(object => {
      if (!(object instanceof Mesh)) return;
      for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
        if (material instanceof MeshStandardMaterial) expect(material.opacity).toBeLessThan(1);
      }
    });
    reveal.update(1.2, true, 1);
    expect(reveal.state).toBe("settled");
    reveal.dispose();
  });

  it("keeps the dinosaur visible and still when motion settings change after a short reveal", async () => {
    missingAsset();
    const reveal = new DinosaurReveal();
    await reveal.load();
    reveal.update(1.2, true, 1);
    expect(reveal.state).toBe("settled");
    const appearance = reveal.entityRoot.children[0]!;
    const settledPosition = appearance.position.clone();
    const settledScale = appearance.scale.clone();
    const settledRotation = appearance.quaternion.clone();
    for (const reducedMotion of [false, true, false]) {
      reveal.update(0.05, reducedMotion, 1);
      expect(reveal.state).toBe("settled");
      expect(reveal.visible).toBe(true);
      expect(appearance.position.distanceTo(settledPosition)).toBe(0);
      expect(appearance.scale.distanceTo(settledScale)).toBe(0);
      expect(appearance.quaternion.angleTo(settledRotation)).toBe(0);
      reveal.entityRoot.traverse(object => {
        if (!(object instanceof Mesh)) return;
        for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
          if (!(material instanceof MeshStandardMaterial)) continue;
          expect(material.opacity).toBe(1);
          expect(material.transparent).toBe(false);
          expect(material.depthWrite).toBe(true);
          expect(material.emissive.getHex()).toBe(0x000000);
          expect(material.emissiveIntensity).toBe(0);
        }
      });
    }
    reveal.dispose();
  });

  it("releases shared model and effect resources once on repeated teardown", async () => {
    missingAsset();
    const reveal = new DinosaurReveal();
    await reveal.load();
    const resources = new Set<{ dispose(): void }>();
    reveal.object3D.traverse(object => {
      if (!(object instanceof Mesh) && !(object instanceof Points)) return;
      resources.add(object.geometry);
      for (const material of Array.isArray(object.material) ? object.material : [object.material]) resources.add(material);
    });
    const spies = [...resources].map(resource => vi.spyOn(resource, "dispose"));
    const parent = new Group();
    parent.add(reveal.object3D);
    reveal.dispose();
    reveal.dispose();
    expect(reveal.object3D.parent).toBeNull();
    for (const spy of spies) expect(spy).toHaveBeenCalledTimes(1);
  });

  it("disposes a GLB that finishes parsing after teardown without attaching it", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(new ArrayBuffer(0))));
    const mesh = new Mesh(new BoxGeometry(1, 1, 1), new MeshStandardMaterial());
    const scene = new Group();
    scene.add(mesh);
    const geometryDispose = vi.spyOn(mesh.geometry, "dispose");
    const materialDispose = vi.spyOn(mesh.material, "dispose");
    let finish!: (result: GLTF) => void;
    const parsing = new Promise<GLTF>(resolve => { finish = resolve; });
    const parse = vi.spyOn(GLTFLoader.prototype, "parseAsync").mockReturnValue(parsing);
    const reveal = new DinosaurReveal();
    const loading = reveal.load();
    await vi.waitFor(() => expect(parse).toHaveBeenCalledOnce());
    reveal.dispose();
    finish({ scene } as GLTF);
    await expect(loading).rejects.toMatchObject({ name: "AbortError" });
    expect(reveal.source).toBe("loading");
    expect(reveal.entityRoot.children[0]!.children).toHaveLength(0);
    expect(geometryDispose).toHaveBeenCalledTimes(1);
    expect(materialDispose).toHaveBeenCalledTimes(1);
  });
});
