import { Box3, ConeGeometry, Group, Mesh, MeshStandardMaterial, SphereGeometry, Vector3 } from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DINOSAUR } from "../../experiences/floating-earth/entities";
import { disposeEarthObjects } from "../../experiences/floating-earth/model";
import { PLAYER_HEIGHT } from "./config/gameplay";

export interface PlayerModel { object3D: Group; source: "glb" | "placeholder"; bounds: Box3; }
let prepared: { abort: AbortController; model: Promise<PlayerModel> } | undefined;

function placeholder() {
  const root = new Group(), sphere = new SphereGeometry(1, 16, 12);
  const material = new MeshStandardMaterial({ color: "#907b60", roughness: 0.9 });
  const part = (x: number, y: number, z: number, sx: number, sy: number, sz: number) => {
    const mesh = new Mesh(sphere, material);
    mesh.position.set(x, y, z); mesh.scale.set(sx, sy, sz); root.add(mesh);
  };
  part(0, 0.7, 0, 0.28, 0.35, 0.56);
  part(0, 1.28, 0.38, 0.13, 0.62, 0.14);
  part(0, 1.86, 0.47, 0.14, 0.13, 0.25);
  for (const x of [-0.2, 0.2]) for (const z of [-0.32, 0.32]) part(x, 0.32, z, 0.1, 0.32, 0.11);
  const tail = new Mesh(new ConeGeometry(0.18, 1.35, 16), material);
  tail.rotation.x = -Math.PI / 2; tail.position.set(0, 0.75, -0.98); root.add(tail);
  return root;
}

export function normalizePlayerModel(scene: Group, source: PlayerModel["source"]): PlayerModel {
  const object3D = new Group(), oriented = new Group();
  object3D.name = "BrachiosaurusPlayer";
  oriented.rotation.y = Math.PI / 3;
  oriented.add(scene); object3D.add(oriented); object3D.updateMatrixWorld(true);
  const bounds = new Box3().setFromObject(oriented, true), center = bounds.getCenter(new Vector3());
  const height = bounds.max.y - bounds.min.y;
  if (!Number.isFinite(height) || height <= 0) throw new Error("Invalid dinosaur geometry");
  const scale = PLAYER_HEIGHT / height;
  oriented.scale.setScalar(scale);
  oriented.position.set(-center.x * scale, -bounds.min.y * scale, -center.z * scale);
  object3D.updateMatrixWorld(true);
  return { object3D, source, bounds: new Box3().setFromObject(object3D, true) };
}

async function loadPlayerModel(signal: AbortSignal): Promise<PlayerModel> {
  let scene: Group | undefined;
  try {
    signal.throwIfAborted();
    const response = await fetch(DINOSAUR.modelUrl, { signal, priority: "low" });
    if (!response.ok) throw new Error("Dinosaur model unavailable");
    const bytes = await response.arrayBuffer();
    signal.throwIfAborted();
    scene = (await new GLTFLoader().parseAsync(bytes, "/floating-earth/")).scene;
    signal.throwIfAborted();
    return normalizePlayerModel(scene, "glb");
  } catch {
    if (scene) disposeEarthObjects(scene);
    signal.throwIfAborted();
    return normalizePlayerModel(placeholder(), "placeholder");
  }
}

export function preloadPlayerModel(signal: AbortSignal) {
  signal.throwIfAborted();
  if (!prepared) {
    const abort = new AbortController();
    signal.addEventListener("abort", () => abort.abort(), { once: true });
    prepared = { abort, model: loadPlayerModel(abort.signal) };
  }
  return prepared.model;
}

export async function takePlayerModel(signal: AbortSignal) {
  signal.throwIfAborted();
  const pending = prepared; prepared = undefined;
  if (!pending) return loadPlayerModel(signal);
  const cancel = () => pending.abort.abort();
  signal.addEventListener("abort", cancel, { once: true });
  try { return await pending.model; }
  finally { signal.removeEventListener("abort", cancel); }
}

export function discardPlayerModel() {
  const pending = prepared; prepared = undefined;
  pending?.abort.abort();
  void pending?.model.then(model => disposeEarthObjects(model.object3D), () => {});
}

export function disposePlayerModel(model: PlayerModel) { disposeEarthObjects(model.object3D); }
