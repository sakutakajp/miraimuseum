import {
  Box3,
  BufferGeometry,
  Color,
  ConeGeometry,
  Group,
  Material,
  Mesh,
  MeshStandardMaterial,
  SphereGeometry,
  Texture,
  Vector3,
} from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DINOSAUR } from "./entities";
import { disposeEarthObjects } from "./model";
import { DinosaurGlow } from "./DinosaurGlow";

export interface DinosaurModel {
  object3D: Group;
  source: "glb" | "placeholder";
  materials: MeshStandardMaterial[];
  glow: DinosaurGlow;
}

function revealMaterial(material: Material): MeshStandardMaterial {
  if (material instanceof MeshStandardMaterial) return material;
  const source = material as Material & { color?: Color; map?: Texture | null };
  const replacement = new MeshStandardMaterial({
    color: source.color ?? new Color("#779794"),
    map: source.map ?? null,
    opacity: material.opacity,
    transparent: material.transparent,
    side: material.side,
    roughness: 0.88,
    metalness: 0,
  });
  material.dispose();
  return replacement;
}

function normalizeModel(scene: Group, source: DinosaurModel["source"]): DinosaurModel {
  const visual = new Group();
  visual.name = "DinosaurVisual";
  const oriented = new Group();
  oriented.name = "DinosaurModelOrientation";
  oriented.rotation.copy(DINOSAUR.modelRotation);
  oriented.add(scene);
  visual.add(oriented);
  visual.updateMatrixWorld(true);

  const bounds = new Box3().setFromObject(oriented, true);
  const size = bounds.getSize(new Vector3());
  const extent = Math.max(size.x, size.y, size.z);
  if (!Number.isFinite(extent) || extent <= 0) throw new Error("Dinosaur model has no visible geometry");
  const scale = DINOSAUR.size / extent;
  const center = bounds.getCenter(new Vector3());
  oriented.scale.setScalar(scale);
  oriented.position.set(-center.x * scale, -bounds.min.y * scale, -center.z * scale);

  const materials = new Set<MeshStandardMaterial>();
  const replacements = new Map<Material, MeshStandardMaterial>();
  scene.traverse((object) => {
    if (!(object instanceof Mesh)) return;
    const convert = (material: Material) => {
      let converted = replacements.get(material);
      if (!converted) {
        converted = revealMaterial(material);
        converted.emissive.set("#000000");
        converted.emissiveIntensity = 0;
        replacements.set(material, converted);
      }
      materials.add(converted);
      return converted;
    };
    object.material = Array.isArray(object.material) ? object.material.map(convert) : convert(object.material);
  });
  visual.updateMatrixWorld(true);
  const glow = new DinosaurGlow(scene);
  return { object3D: visual, source, materials: [...materials], glow };
}

function createPlaceholder(): Group {
  const dinosaur = new Group();
  dinosaur.name = "TemporaryDinosaur";
  const material = new MeshStandardMaterial({ color: "#668b88", roughness: 0.94, metalness: 0 });
  const sphere = new SphereGeometry(1, 16, 10);
  const part = (name: string, geometry: BufferGeometry, position: Vector3, scale: Vector3) => {
    const mesh = new Mesh(geometry, material);
    mesh.name = name;
    mesh.position.copy(position);
    mesh.scale.copy(scale);
    dinosaur.add(mesh);
    return mesh;
  };
  part("Body", sphere, new Vector3(0, 0.72, 0), new Vector3(0.21, 0.36, 0.40));
  part("Neck", sphere, new Vector3(0, 1.03, 0.25), new Vector3(0.13, 0.28, 0.15));
  part("Head", sphere, new Vector3(0, 1.25, 0.47), new Vector3(0.15, 0.15, 0.28));
  const tail = part("Tail", new ConeGeometry(0.20, 1.1, 16),
    new Vector3(0, 0.68, -0.71), new Vector3(1, 1, 1));
  tail.rotation.x = -Math.PI / 2 - 0.13;
  for (const side of [-1, 1]) {
    part("Leg", sphere, new Vector3(side * 0.14, 0.34, 0), new Vector3(0.09, 0.31, 0.13));
    part("Foot", sphere, new Vector3(side * 0.14, 0.055, 0.10), new Vector3(0.09, 0.055, 0.19));
    part("Arm", sphere, new Vector3(side * 0.19, 0.88, 0.25), new Vector3(0.035, 0.10, 0.055));
  }
  return dinosaur;
}

/** An optional entity must never prevent the Earth itself from becoming ready. */
export async function loadDinosaurModel(signal: AbortSignal): Promise<DinosaurModel> {
  let scene: Group | undefined;
  try {
    signal.throwIfAborted();
    const response = await fetch(DINOSAUR.modelUrl, { signal });
    if (!response.ok) throw new Error("Dinosaur model unavailable");
    const bytes = await response.arrayBuffer();
    signal.throwIfAborted();
    const gltf = await new GLTFLoader().parseAsync(bytes, "/floating-earth/");
    scene = gltf.scene;
    signal.throwIfAborted();
    // Keep the rig available for future walking; this introduction plays no clips.
    return normalizeModel(scene, "glb");
  } catch {
    if (scene) disposeEarthObjects(scene);
    signal.throwIfAborted();
    return normalizeModel(createPlaceholder(), "placeholder");
  }
}
