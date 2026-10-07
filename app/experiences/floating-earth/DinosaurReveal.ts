import { Group, Vector3 } from "three";
import { DINOSAUR, placeOnSphere } from "./entities";
import { loadDinosaurModel, type DinosaurModel } from "./DinosaurModel";
import { RevealEffects } from "./effects";
import { disposeEarthObjects } from "./model";

const smooth = (a: number, b: number, t: number) => {
  const x = Math.max(0, Math.min(1, (t - a) / (b - a)));
  return x * x * (3 - 2 * x);
};
export type RevealPhase = "waiting" | "light" | "revealing" | "settled";

export function revealAt(time: number, reducedMotion: boolean) {
  const start = reducedMotion ? 0.45 : 1.2;
  const appear = reducedMotion ? 0.55 : 1.95;
  const finish = reducedMotion ? 0.95 : 2.95;
  const settle = reducedMotion ? 1.15 : 3.5;
  const opacity = smooth(appear, finish, time);
  const light = smooth(start, reducedMotion ? 0.7 : 2.15, time)
    * (1 - 0.94 * smooth(finish - 0.15, settle, time));
  const phase: RevealPhase = time < start ? "waiting" : time < appear ? "light" : time < settle ? "revealing" : "settled";
  return { phase, opacity, light, scale: reducedMotion ? 1 : 0.88 + 0.12 * (1 - Math.pow(1 - opacity, 3)) };
}

/** Surface placement stays separate from appearance and future model animation. */
export class DinosaurReveal {
  readonly object3D = new Group();
  readonly entityRoot = new Group();
  readonly effectRoot: Group;
  private effects = new RevealEffects();
  private appearance = new Group();
  private model?: DinosaurModel;
  private lifetime = new AbortController();
  private elapsed = 0;
  private reducedMotion = false;
  private disposed = false;
  private normal = new Vector3().copy(DINOSAUR.normal);
  private worldNormal = new Vector3();
  private phase: RevealPhase = "waiting";

  constructor() {
    this.object3D.name = "DinosaurSurfaceAnchor";
    this.entityRoot.name = "DinosaurEntityRoot";
    this.entityRoot.userData.entityId = DINOSAUR.id;
    this.entityRoot.userData.targetRoute = DINOSAUR.targetRoute;
    this.effectRoot = this.effects.object3D;
    this.entityRoot.add(this.appearance);
    this.object3D.add(this.entityRoot, this.effectRoot);
    placeOnSphere(this.object3D, this.normal, 1, DINOSAUR.surfaceOffset);
    this.entityRoot.visible = false;
  }

  async load() {
    const model = await loadDinosaurModel(this.lifetime.signal);
    if (this.disposed) { disposeEarthObjects(model.object3D); return; }
    this.model = model;
    this.appearance.add(model.object3D);
    // A slow optional asset never skips its light-first introduction.
    this.elapsed = Math.min(this.elapsed, this.reducedMotion ? 0.45 : 1.2);
  }

  update(delta: number, reducedMotion: boolean, pixelRatio: number) {
    if (this.disposed) return;
    this.reducedMotion = reducedMotion;
    this.elapsed += delta;
    if (!this.model) return;
    const frame = revealAt(this.phase === "settled" ? Math.max(3.5, this.elapsed) : this.elapsed, reducedMotion);
    this.phase = frame.phase;
    this.entityRoot.visible = frame.opacity > 0;
    this.appearance.scale.setScalar(frame.scale);
    this.appearance.position.y = reducedMotion || frame.opacity === 1 ? 0 : -0.009 * (1 - frame.opacity);
    for (const material of this.model.materials) {
      material.opacity = frame.opacity;
      if (material.transparent !== (frame.opacity < 1)) {
        material.transparent = frame.opacity < 1;
        material.needsUpdate = true;
      }
      material.depthWrite = frame.opacity === 1;
      material.emissiveIntensity = 0.1 + (1 - frame.opacity) * 0.14;
    }
    this.model.glow.update(frame.opacity);
    this.effects.update(this.elapsed, frame.light, reducedMotion, pixelRatio);
  }

  get state() { return this.phase; }
  get source() { return this.model?.source ?? "loading"; }
  get visible() { return this.entityRoot.visible; }
  getAnchorWorldPosition(target: Vector3) { return this.object3D.getWorldPosition(target); }

  isFrontFacing(cameraForward: Vector3) {
    this.object3D.updateWorldMatrix(true, false);
    this.worldNormal.set(0, 1, 0).transformDirection(this.object3D.matrixWorld);
    return this.worldNormal.dot(cameraForward) < 0;
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.lifetime.abort();
    if (this.model) disposeEarthObjects(this.model.object3D);
    this.effects.dispose();
    this.object3D.removeFromParent();
  }
}
