import { Box3, Group, Matrix4, Mesh, Vector3 } from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { CYBERTRUCK } from "./entities";
import { DinosaurGlow } from "./DinosaurGlow";
import { disposeEarthObjects } from "./model";

/** A rigid vehicle, grounded on the sphere and always clear of the dinosaur. */
export class CybertruckVehicle {
  readonly object3D = new Group();
  private visual?: Group;
  private bounds = new Box3();
  private lifetime = new AbortController();
  private disposed = false;
  private modelSource: "loading" | "glb" | "unavailable" = "loading";
  private orbitAngle = 0;
  private radius = 1 + CYBERTRUCK.surfaceOffset;
  private start = CYBERTRUCK.initialNormal.clone();
  private across = new Vector3().crossVectors(CYBERTRUCK.orbitAxis, this.start).normalize();
  private normal = new Vector3();
  private forward = new Vector3();
  private worldNormal = new Vector3();
  private orientation = new Matrix4();

  constructor() {
    this.object3D.name = "CybertruckSurfaceAnchor";
    this.object3D.visible = false;
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
      new DinosaurGlow(scene).update(1);
      this.visual = visual;
      this.object3D.add(visual);
      this.modelSource = "glb";
      this.object3D.visible = true;
      this.place();
    } catch {
      if (scene) disposeEarthObjects(scene);
      this.lifetime.signal.throwIfAborted();
      this.modelSource = "unavailable";
    }
  }

  update(delta: number, reducedMotion: boolean) {
    if (this.disposed || this.modelSource !== "glb" || reducedMotion) return;
    this.orbitAngle = (this.orbitAngle + delta * CYBERTRUCK.orbitSpeed) % (Math.PI * 2);
    this.place();
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
  get angle() { return this.orbitAngle; }
  get visible() { return this.object3D.visible; }
  getWorldBounds(target: Box3) {
    if (!this.visual) return target.makeEmpty();
    this.object3D.updateWorldMatrix(true, false);
    return target.copy(this.bounds).applyMatrix4(this.object3D.matrixWorld);
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.lifetime.abort();
    if (this.visual) disposeEarthObjects(this.visual);
    this.object3D.removeFromParent();
  }
}
