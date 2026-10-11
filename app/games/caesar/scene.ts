import { SceneRuntime, runtimeResources } from "~/three-d/runtime";
import { FreeCamera } from "@babylonjs/core/Cameras/freeCamera";
import { Camera } from "@babylonjs/core/Cameras/camera";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Color3, Color4 } from "@babylonjs/core/Maths/math.color";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { CreateBox } from "@babylonjs/core/Meshes/Builders/boxBuilder";
import { CreateCylinder } from "@babylonjs/core/Meshes/Builders/cylinderBuilder";
import { CreateTorus } from "@babylonjs/core/Meshes/Builders/torusBuilder";
import { CreateIcoSphere } from "@babylonjs/core/Meshes/Builders/icoSphereBuilder";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { cutStone } from "./geometry";

export interface WorldState {
  stage: 1 | 2; bridgeSolved: boolean; repaired: number; complete: boolean;
  atHome: boolean; footsteps: number; happy: boolean; word: string; practice: boolean;
}
export interface RuinWorld { update: (state: WorldState) => void; quality: (light: boolean) => void; dispose: () => void }

/** Small responsive actors and mechanisms over the existing illustrated ruins. */
export function createRuinWorld(canvas: HTMLCanvasElement, reducedMotion: boolean, lightQuality: boolean, onFailure: (error: unknown) => void): RuinWorld {
  const runtime = new SceneRuntime(canvas, lightQuality ? "low" : "high", onFailure, { transparent: true });
  try {
    const { scene } = runtime;
    scene.useRightHandedSystem = false;
    scene.clearColor = new Color4(0, 0, 0, 0);
    const camera = new FreeCamera("ruins-camera", new Vector3(0, 50, -100), scene);
    camera.setTarget(new Vector3(0, 50, 0)); camera.mode = Camera.ORTHOGRAPHIC_CAMERA;
    camera.orthoTop = 50; camera.orthoBottom = -50;
    const sky = new HemisphericLight("warm-sky", new Vector3(-1, 1, -1), scene);
    sky.intensity = .95; sky.groundColor = Color3.FromHexString("#45656A");
    const material = (name: string, color: string, glow = false) => {
      const m = new StandardMaterial(name, scene); m.diffuseColor = Color3.FromHexString(color);
      m.specularColor = new Color3(.1, .08, .04);
      if (glow) { m.emissiveColor = m.diffuseColor; m.disableLighting = true; }
      return m;
    };
    const stone = material("sandstone", "#C9AE7C"), fur = material("mii-fur", "#D8AE73"), cream = material("mii-cream", "#F0DCAC");
    const dark = material("gentle-eyes", "#233D43"), koroStone = material("koro-stone", "#ABBAAB");
    const teal = material("restored-magic", "#57DDD4", true), scarf = material("mii-scarf", "#387D7C");
    fur.emissiveColor = fur.diffuseColor.scale(.2); cream.emissiveColor = cream.diffuseColor.scale(.15);
    const mii = new TransformNode("mii-kitten", scene);
    const shape = (name: string, radius: number, parent: TransformNode, m: StandardMaterial, x: number, y: number, z: number) => {
      const mesh = CreateIcoSphere(name, { radius, subdivisions: 1, flat: true }, scene);
      mesh.parent = parent; mesh.material = m; mesh.position.set(x, y, z); return mesh;
    };
    const body = shape("mii-body", 4.5, mii, fur, 0, 5.5, 0); body.scaling.set(1, 1.2, .8);
    const head = shape("mii-head", 4.7, mii, fur, 0, 12, -1); head.scaling.set(1.1, .9, .85);
    const muzzle = shape("mii-muzzle", 2.6, mii, cream, 0, 10.5, -4.6); muzzle.scaling.set(1.3, .65, .5);
    [-3, 3].forEach(x => {
      const ear = CreateCylinder("mii-ear", { height: 5, diameterTop: 0, diameterBottom: 3.4, tessellation: 3 }, scene);
      ear.parent = mii; ear.material = fur; ear.position.set(x, 16, -.6); ear.rotation.z = x < 0 ? .2 : -.2;
      const eye = shape("mii-eye", .65, mii, dark, x * .75, 12, -4.4); eye.scaling.z = .5;
    });
    shape("mii-nose", .5, mii, dark, 0, 10.8, -6);
    const feet = [-2.5, 2.5].map(x => {
      const foot = shape("mii-paw", 1.5, mii, cream, x, 1.5, -1); foot.scaling.set(.8, 1.1, 1); return foot;
    });
    const tail = new TransformNode("mii-tail", scene); tail.parent = mii; tail.position.set(4, 4, 1);
    [0, 1, 2].forEach(i => { const part = shape("mii-tail-segment", 1.35, tail, fur, i, i * 2.2, 0); part.scaling.y = 1.5; });
    const collar = CreateTorus("mii-scarf", { diameter: 6.8, thickness: 1.1, tessellation: 8 }, scene);
    collar.parent = mii; collar.material = scarf; collar.position.y = 8.5;
    const koro = new TransformNode("koro-guide", scene);
    const guideBody = cutStone("koro-body", 9, 10, 5, scene); guideBody.parent = koro; guideBody.material = koroStone; guideBody.position.y = 6;
    [-2, 2].forEach(x => { shape("koro-eye", .6, koro, dark, x, 7, -2.8); shape("koro-foot", 1.4, koro, koroStone, x * 1.4, .7, 0); });
    const smile = CreateBox("koro-smile", { width: 2, height: .4, depth: .3 }, scene); smile.parent = koro; smile.material = dark; smile.position.set(0, 4.5, -2.8);
    shape("koro-mark", .9, koro, teal, 0, 10, -2.8);
    const steps = Array.from({ length: 4 }, (_, index) => {
      const root = new TransformNode(`joining-footstep-${index}`, scene);
      const block = cutStone("gap-stone", 12, 3, 5, scene); block.parent = root; block.material = stone; block.rotation.x = -.3;
      const seam = CreateBox("magic-edge", { width: 12, height: .4, depth: .2 }, scene); seam.parent = root; seam.material = teal; seam.position.set(0, -1.3, -3);
      return root;
    });
    const circuits = Array.from({ length: 3 }, (_, i) => {
      const ring = CreateTorus("restored-circuit", { diameter: 30 + i * 6, thickness: .5, tessellation: 24 }, scene);
      ring.material = teal; ring.rotation.x = Math.PI / 2; return ring;
    });
    const crystal = shape("awakened-crystal", 5, new TransformNode("crystal-root", scene), teal, 0, 0, -1);
    let world: WorldState = { stage: 1, bridgeSolved: false, repaired: 0, complete: false, atHome: false, footsteps: 0, happy: false, word: "", practice: false };
    let elapsed = 0, happyElapsed = 0, currentX = 14, aspect = 1;
    const point = (x: number, y: number, z = 0) => new Vector3((x - 50) * aspect, y, z);
    const layout = () => {
      const height = Math.max(1, canvas.clientHeight);
      aspect = Math.max(1, canvas.clientWidth) / height;
      camera.orthoLeft = -50 * aspect; camera.orthoRight = 50 * aspect;
      const size = Math.min(55, height * .7);
      mii.scaling.setAll(size / height * 100 / 18.5); koro.scaling.setAll(size * .68 / height * 100 / 12);
      circuits.forEach(ring => { ring.position.copyFrom(point(68, 55)); });
      crystal.position.copyFrom(point(68, 55, -1));
      steps.forEach((step, i) => { step.scaling.x = aspect * .7; step.position.copyFrom(point(30 + i * 15, 15)); });
    };
    const observer = new ResizeObserver(layout); observer.observe(canvas); runtime.own(() => observer.disconnect()); layout();
    if (import.meta.dev) {
      const debugWindow = window as Window & { __caesar3d?: { resources: typeof runtimeResources; metrics: () => ReturnType<SceneRuntime["metrics"]> } };
      debugWindow.__caesar3d = { resources: runtimeResources, metrics: () => runtime.metrics() };
      runtime.own(() => { delete debugWindow.__caesar3d; });
    }
    runtime.run(dt => {
      elapsed += dt;
      const targetX = world.atHome || world.bridgeSolved ? 84 : world.stage === 1 && world.practice && world.footsteps > 0 ? 15 + world.footsteps * 15 : 14;
      const walking = Math.abs(currentX - targetX) > .5;
      currentX = reducedMotion ? targetX : currentX + (targetX - currentX) * Math.min(1, dt * 3);
      if (world.happy) happyElapsed += dt;
      const hop = !reducedMotion && world.happy && happyElapsed < 1 ? Math.abs(Math.sin(happyElapsed * Math.PI * 2)) * 4 : 0;
      mii.position.copyFrom(point(currentX, 20 + hop, -5)); koro.position.copyFrom(point(5, 16, -4));
      feet.forEach((foot, i) => { foot.rotation.x = !reducedMotion && walking ? Math.sin(elapsed * 14 + i * Math.PI) * .45 : 0; });
      tail.rotation.z = reducedMotion ? 0 : Math.sin(elapsed * 2) * .1;
      steps.forEach((step, i) => {
        step.setEnabled(world.stage === 1 && (world.bridgeSolved || world.footsteps > i));
      });
      circuits.forEach((ring, i) => { ring.visibility = world.stage === 2 && !world.atHome && world.repaired > i ? .45 : 0; });
      crystal.visibility = world.stage === 2 && !world.atHome && world.complete ? .65 : 0;
      if (!reducedMotion && world.complete) crystal.rotation.y += dt * .4;
    });
    return {
      update(next) { if (next.happy && !world.happy) happyElapsed = 0; world = next; layout(); },
      quality: light => runtime.setQuality(light ? "low" : "high"), dispose: () => runtime.dispose(),
    };
  } catch (error) { runtime.dispose(); throw error; }
}
