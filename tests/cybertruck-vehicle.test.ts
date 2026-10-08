import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  Box3, BoxGeometry, BufferGeometry, Float32BufferAttribute, Group, Mesh,
  MeshStandardMaterial, Texture, Vector3,
} from "three";
import { GLTFLoader, type GLTF } from "three/addons/loaders/GLTFLoader.js";
import { CybertruckVehicle } from "../app/experiences/floating-earth/CybertruckVehicle";
import { CYBERTRUCK, DINOSAUR, placeOnSphere } from "../app/experiences/floating-earth/entities";

const vehicles: CybertruckVehicle[] = [];
afterEach(() => {
  for (const vehicle of vehicles.splice(0)) vehicle.dispose();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
const createVehicle = () => {
  const vehicle = new CybertruckVehicle();
  vehicles.push(vehicle);
  return vehicle;
};

/** Use the uploaded geometry, avoiding image decoding in the Node test runner. */
function uploadedModel() {
  const bytes = readFileSync(new URL("../public/floating-earth/cybertruck.glb", import.meta.url));
  const jsonLength = bytes.readUInt32LE(12);
  const document = JSON.parse(bytes.toString("utf8", 20, 20 + jsonLength));
  const accessor = document.accessors[document.meshes[0].primitives[0].attributes.POSITION];
  const view = document.bufferViews[accessor.bufferView];
  const offset = 28 + jsonLength + (view.byteOffset ?? 0) + (accessor.byteOffset ?? 0);
  const positions = new Float32Array(accessor.count * 3);
  for (let i = 0; i < accessor.count; i++) {
    for (let axis = 0; axis < 3; axis++) positions[i * 3 + axis] = bytes.readFloatLE(offset + i * (view.byteStride ?? 12) + axis * 4);
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  const material = new MeshStandardMaterial({ map: new Texture() });
  const mesh = new Mesh(geometry, material);
  const scene = new Group();
  scene.add(mesh);
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(bytes)));
  vi.spyOn(GLTFLoader.prototype, "parseAsync").mockResolvedValue({ scene } as GLTF);
  return { scene, mesh, material };
}

describe("the uploaded Cybertruck on Earth", () => {
  it("matches the dinosaur's maximum dimension and preserves the original textured material", async () => {
    const { mesh, material } = uploadedModel();
    const originalTexture = material.map;
    const vehicle = createVehicle();
    await vehicle.load();
    expect(vehicle.source).toBe("glb");
    const raw = new Box3().setFromBufferAttribute(mesh.geometry.getAttribute("position")).getSize(new Vector3());
    const scale = mesh.getWorldScale(new Vector3());
    expect(Math.max(raw.x, raw.y, raw.z) * scale.x).toBeCloseTo(DINOSAUR.size, 8);
    expect(scale.y).toBeCloseTo(scale.x, 8);
    expect(scale.z).toBeCloseTo(scale.x, 8);
    expect(mesh.material).toBe(material);
    expect(material.map).toBe(originalTexture);
    expect(material.emissiveIntensity).toBe(1);
    expect(material.emissive.getHex()).toBe(0);
    // The silhouette emitter is shared; the body keeps its ordinary shading.
    expect(mesh.userData.dinosaurRim.value).toBe(1);
    expect(fetch).toHaveBeenCalledWith(CYBERTRUCK.modelUrl, expect.objectContaining({ signal: expect.any(AbortSignal) }));
    expect(vehicle.object3D.position.length()).toBeGreaterThan(0.97);
    expect(vehicle.object3D.position.length()).toBeLessThan(1);
  });

  it("keeps the complete car clear of the complete dinosaur throughout a lap and Earth rotations", async () => {
    uploadedModel();
    const vehicle = createVehicle();
    await vehicle.load();
    const earth = new Group(), dinosaur = new Group();
    placeOnSphere(dinosaur, DINOSAUR.normal, 1, DINOSAUR.surfaceOffset);
    earth.add(dinosaur, vehicle.object3D);
    const d = DINOSAUR.size;
    // This envelope contains every possible normalized dinosaur vertex.
    const dinosaurLocal = new Box3(new Vector3(-d / 2, 0, -d / 2), new Vector3(d / 2, d, d / 2));
    const carWorld = new Box3();
    const duration = Math.PI * 2 / CYBERTRUCK.orbitSpeed;
    for (let frame = 0; frame < 180; frame++) {
      vehicle.update(duration / 180, false);
      expect(vehicle.object3D.position.clone().normalize().dot(DINOSAUR.normal)).toBeCloseTo(0, 10);
      for (const pitch of [-0.9, 0, 0.9]) {
        earth.rotation.set(pitch, frame * 0.07, 0, "YXZ");
        earth.updateMatrixWorld(true);
        const dinosaurWorld = dinosaurLocal.clone().applyMatrix4(dinosaur.matrixWorld);
        expect(vehicle.getWorldBounds(carWorld).intersectsBox(dinosaurWorld)).toBe(false);
      }
    }
  });

  it("aligns the car with the local ground and the direction it drives", async () => {
    uploadedModel();
    const vehicle = createVehicle();
    await vehicle.load();
    for (let frame = 0; frame < 80; frame++) {
      vehicle.update(0.5, false);
      const before = vehicle.object3D.position.clone();
      const up = new Vector3(0, 1, 0).applyQuaternion(vehicle.object3D.quaternion);
      const forward = new Vector3(0, 0, 1).applyQuaternion(vehicle.object3D.quaternion);
      expect(up.distanceTo(before.clone().normalize())).toBeLessThan(1e-10);
      expect(forward.dot(up)).toBeCloseTo(0, 10);
      vehicle.update(0.001, false);
      const direction = vehicle.object3D.position.clone().sub(before).normalize();
      expect(direction.dot(forward)).toBeGreaterThan(0.99999);
    }
  });

  it("stops the drive for reduced motion and hides the vehicle on the far hemisphere", async () => {
    uploadedModel();
    const vehicle = createVehicle();
    await vehicle.load();
    const earth = new Group();
    earth.rotation.set(12 * Math.PI / 180, 100 * Math.PI / 180, 0, "XYZ");
    const rotation = new Group();
    rotation.add(earth);
    earth.add(vehicle.object3D);
    const before = vehicle.object3D.position.clone();
    const orientation = vehicle.object3D.quaternion.clone();
    vehicle.update(10, true);
    expect(vehicle.object3D.position).toEqual(before);
    expect(vehicle.object3D.quaternion.toArray()).toEqual(orientation.toArray());
    vehicle.updateVisibility(new Vector3(0, 0, -1));
    expect(vehicle.visible).toBe(true);
    rotation.rotation.y = Math.PI;
    vehicle.updateVisibility(new Vector3(0, 0, -1));
    expect(vehicle.visible).toBe(false);
  });

  it("isolates a missing or corrupt vehicle asset", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 404 })));
    const missing = createVehicle();
    await expect(missing.load()).resolves.toBeUndefined();
    expect(missing.source).toBe("unavailable");
    expect(missing.visible).toBe(false);
    uploadedModel();
    vi.spyOn(GLTFLoader.prototype, "parseAsync").mockRejectedValue(new Error("Invalid GLB"));
    const corrupt = createVehicle();
    await expect(corrupt.load()).resolves.toBeUndefined();
    expect(corrupt.source).toBe("unavailable");
    expect(corrupt.visible).toBe(false);
  });

  it("releases a model that finishes parsing after the page has closed", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(new ArrayBuffer(0))));
    const scene = new Group();
    const mesh = new Mesh(new BoxGeometry(1, 1, 1), new MeshStandardMaterial());
    scene.add(mesh);
    const releaseGeometry = vi.spyOn(mesh.geometry, "dispose");
    const releaseMaterial = vi.spyOn(mesh.material, "dispose");
    let finish!: (result: GLTF) => void;
    const parse = vi.spyOn(GLTFLoader.prototype, "parseAsync").mockReturnValue(new Promise(resolve => { finish = resolve; }));
    const vehicle = createVehicle();
    const loading = vehicle.load();
    await vi.waitFor(() => expect(parse).toHaveBeenCalledOnce());
    vehicle.dispose();
    finish({ scene } as GLTF);
    await expect(loading).rejects.toMatchObject({ name: "AbortError" });
    expect(vehicle.object3D.children).toHaveLength(0);
    expect(releaseGeometry).toHaveBeenCalledOnce();
    expect(releaseMaterial).toHaveBeenCalledOnce();
  });
});
