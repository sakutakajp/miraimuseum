import { Box3, Group, Material, Matrix4, Mesh, MeshStandardMaterial, Texture, Vector3 } from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { CYBERTRUCK } from "./entities";
import { DinosaurGlow } from "./DinosaurGlow";
import { disposeEarthObjects } from "./model";
import { revealAt, type RevealPhase } from "./DinosaurReveal";
import { RevealEffects } from "./effects";

/** A rigid vehicle, grounded on the sphere and always clear of the dinosaur. */
export class CybertruckVehicle {
  readonly object3D = new Group();
  readonly effectRoot: Group;
  private appearance = new Group();
  private effects = new RevealEffects("Cybertruck");
  private materials = new Set<Material>();
  private environment?: Texture;
  private glow?: DinosaurGlow;
  private visual?: Group;
  private bounds = new Box3();
  private lifetime = new AbortController();
  private disposed = false;
  private modelSource: "loading" | "glb" | "unavailable" = "loading";
  private orbitAngle = 0;
  private elapsed = 0;
  private phase: RevealPhase;
  private radius = 1 + CYBERTRUCK.surfaceOffset;
  private start = CYBERTRUCK.initialNormal.clone();
  private across = new Vector3().crossVectors(CYBERTRUCK.orbitAxis, this.start).normalize();
  private normal = new Vector3();
  private forward = new Vector3();
  private worldNormal = new Vector3();
  private orientation = new Matrix4();

  constructor(reveal = false) {
    this.phase = reveal ? "waiting" : "settled";
    this.object3D.name = "CybertruckSurfaceAnchor";
    this.object3D.visible = false;
    this.appearance.name = "CybertruckAppearance";
    this.appearance.visible = !reveal;
    this.effectRoot = this.effects.object3D;
    this.object3D.add(this.appearance, this.effectRoot);
    this.place();
  }

  async load() {
    let scene: Group | undefined;
    try {
      const signal = this.lifetime.signal;
      signal.throwIfAborted();
      const response = await fetch(CYBERTRUCK.modelUrl, { signal });
      if (!response.ok) throw new Error("Cybertruck model unavailable");
      const bytes = await response.arrayBuffer();
      signal.throwIfAborted();
      scene = (await new GLTFLoader().parseAsync(bytes, "/floating-earth/")).scene;
      signal.throwIfAborted();

      const visual = new Group();
      visual.name = "CybertruckVisual";
      const oriented = new Group();
      oriented.rotation.copy(CYBERTRUCK.modelRotation);
      oriented.add(scene);
      visual.add(oriented);
      visual.updateMatrixWorld(true);
      const bounds = new Box3().setFromObject(visual, true);
      const size = bounds.getSize(new Vector3());
      const extent = Math.max(size.x, size.y, size.z);
      if (!Number.isFinite(extent) || extent <= 0) throw new Error("Cybertruck model has no visible geometry");
      const scale = CYBERTRUCK.size / extent;
      const center = bounds.getCenter(new Vector3());
      oriented.scale.setScalar(scale);
      oriented.position.set(-center.x * scale, -bounds.min.y * scale, -center.z * scale);
      visual.updateMatrixWorld(true);
      this.bounds.setFromObject(visual, true);

      // The four tire contacts lie below a tangent plane on a curved globe.
      // Match their mean footprint to the sphere instead of floating the wheels.
      let footprint = 0, contacts = 0;
      const vertex = new Vector3();
      const floor = this.bounds.max.y * 0.025;
      visual.traverse(object => {
        if (!(object instanceof Mesh)) return;
        const positions = object.geometry.getAttribute("position");
        for (let i = 0; i < positions.count; i++) {
          vertex.fromBufferAttribute(positions, i).applyMatrix4(object.matrixWorld);
          if (vertex.y > floor) continue;
          footprint += Math.hypot(vertex.x, vertex.z);
          contacts++;
        }
      });
      if (contacts) this.radius = Math.sqrt(1 - (footprint / contacts) ** 2) + CYBERTRUCK.surfaceOffset;
      scene.traverse(object => {
        if (object instanceof Mesh) {
          for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
            this.materials.add(material);
          }
        }
      });
      if (this.environment) this.setEnvironment(this.environment);
      this.glow = new DinosaurGlow(scene);
      this.glow.update(this.phase === "settled" ? 1 : 0);
      this.visual = visual;
      this.appearance.add(visual);
      // Effects start on the sphere, while the tires follow its curved surface.
      this.effectRoot.position.y = 1 + CYBERTRUCK.surfaceOffset - this.radius;
      this.modelSource = "glb";
      this.object3D.visible = true;
      this.place();
    } catch {
      if (scene) disposeEarthObjects(scene);
      this.lifetime.signal.throwIfAborted();
      this.modelSource = "unavailable";
    }
  }

  update(delta: number, reducedMotion: boolean, pixelRatio = 1, revealDelta = delta) {
    if (this.disposed || this.modelSource !== "glb") return;
    const alreadySettled = this.phase === "settled";
    this.elapsed += revealDelta;
    const time = alreadySettled ? Math.max(3.5, this.elapsed) : this.elapsed;
    const frame = revealAt(time, reducedMotion);
    this.phase = frame.phase;
    this.appearance.visible = frame.opacity > 0;
    this.appearance.scale.setScalar(frame.scale);
    this.appearance.position.y = reducedMotion || frame.opacity === 1 ? 0 : -0.009 * (1 - frame.opacity);
    for (const material of this.materials) {
      material.opacity = frame.opacity;
      if (material.transparent !== (frame.opacity < 1)) {
        material.transparent = frame.opacity < 1;
        material.needsUpdate = true;
      }
      material.depthWrite = frame.opacity === 1;
    }
    this.glow?.update(frame.opacity);
    this.effects.update(time, frame.light, reducedMotion, pixelRatio);
    // Finish the light-first introduction at a stationary point before driving.
    if (alreadySettled && !reducedMotion) {
      this.orbitAngle = (this.orbitAngle + delta * CYBERTRUCK.orbitSpeed) % (Math.PI * 2);
      this.place();
    }
  }

  setEnvironment(environment: Texture) {
    this.environment = environment;
    // Metallic silver needs surroundings to reflect, even on a black page.
    for (const material of this.materials) {
      if (!(material instanceof MeshStandardMaterial)) continue;
      material.envMap = environment;
      material.envMapIntensity = 1.3;
      material.needsUpdate = true;
    }
  }

  private place() {
    const c = Math.cos(this.orbitAngle), s = Math.sin(this.orbitAngle);
    this.normal.copy(this.start).multiplyScalar(c).addScaledVector(this.across, s);
    this.forward.copy(this.across).multiplyScalar(c).addScaledVector(this.start, -s);
    this.object3D.position.copy(this.normal).multiplyScalar(this.radius);
    this.orientation.makeBasis(CYBERTRUCK.orbitAxis, this.normal, this.forward);
    this.object3D.quaternion.setFromRotationMatrix(this.orientation);
  }

  updateVisibility(cameraForward: Vector3) {
    this.object3D.updateWorldMatrix(true, false);
    this.worldNormal.set(0, 1, 0).transformDirection(this.object3D.matrixWorld);
    this.object3D.visible = this.modelSource === "glb" && this.worldNormal.dot(cameraForward) < 0;
  }

  get source() { return this.modelSource; }
  get entityRoot() { return this.appearance; }
  get state() { return this.phase; }
  get angle() { return this.orbitAngle; }
  get visible() { return this.modelSource === "glb" && this.object3D.visible && this.appearance.visible; }
  get columnVisible() { return this.object3D.visible && this.effects.columnVisible; }
  getWorldBounds(target: Box3) {
    if (!this.visual) return target.makeEmpty();
    this.appearance.updateWorldMatrix(true, false);
    return target.copy(this.bounds).applyMatrix4(this.appearance.matrixWorld);
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.lifetime.abort();
    // The world owns the reflection render target; release only the GLB textures.
    for (const material of this.materials) {
      if (material instanceof MeshStandardMaterial && material.envMap === this.environment) material.envMap = null;
    }
    if (this.visual) disposeEarthObjects(this.visual);
    this.effects.dispose();
    this.appearance.clear();
    this.object3D.clear();
    this.object3D.removeFromParent();
  }
}
