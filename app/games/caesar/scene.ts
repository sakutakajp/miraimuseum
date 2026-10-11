import { SceneRuntime, runtimeResources } from "~/three-d/runtime";
import { FreeCamera } from "@babylonjs/core/Cameras/freeCamera";
import { Camera } from "@babylonjs/core/Cameras/camera";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Color3, Color4 } from "@babylonjs/core/Maths/math.color";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { CreateBox } from "@babylonjs/core/Meshes/Builders/boxBuilder";
import { CreateCylinder } from "@babylonjs/core/Meshes/Builders/cylinderBuilder";
import { CreateSphere } from "@babylonjs/core/Meshes/Builders/sphereBuilder";
import { CreateTorus } from "@babylonjs/core/Meshes/Builders/torusBuilder";
import { CreateIcoSphere } from "@babylonjs/core/Meshes/Builders/icoSphereBuilder";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { cutStone } from "./geometry";

export interface WorldState { stage: 1 | 2; bridgeSolved: boolean; repaired: number; complete: boolean }
export interface RuinWorld { update: (state: WorldState) => void; quality: (light: boolean) => void; dispose: () => void }

/** Image landmarks keep the moving mechanisms on the illustration, including after responsive cropping. */
export function createRuinWorld(canvas: HTMLCanvasElement, reducedMotion: boolean, lightQuality: boolean, onFailure: (error: unknown) => void): RuinWorld {
  const runtime = new SceneRuntime(canvas, lightQuality ? "low" : "high", onFailure, { transparent: true });
  try {
    const { scene } = runtime;
    scene.useRightHandedSystem = false;
    scene.clearColor = new Color4(0, 0, 0, 0);
    const camera = new FreeCamera("illustration-effects", new Vector3(50, 50, -100), scene);
    camera.setTarget(new Vector3(50, 50, 0));
    camera.mode = Camera.ORTHOGRAPHIC_CAMERA;
    camera.orthoLeft = -50; camera.orthoRight = 50;
    camera.orthoTop = 50; camera.orthoBottom = -50;
    const sky = new HemisphericLight("warm-sky", new Vector3(-1, 1, -1), scene);
    sky.intensity = .95;
    sky.groundColor = Color3.FromHexString("#45656A");
    const material = (name: string, color: string, glow = false) => {
      const m = new StandardMaterial(name, scene);
      m.diffuseColor = Color3.FromHexString(color);
      m.specularColor = new Color3(.1, .08, .04);
      if (glow) { m.emissiveColor = m.diffuseColor; m.disableLighting = true; }
      return m;
    };
    const stone = material("joining-sandstone", "#C9AE7C");
    const brass = material("satchel-brass", "#B88B45");
    const teal = material("restored-magic", "#57DDD4", true);
    const cloak = material("explorer-cloak", "#B96936");
    const hood = material("explorer-hood", "#D48C4A");
    const boot = material("explorer-boots", "#4B3625");
    const bridge = new TransformNode("bridge-effects", scene);
    const machine = new TransformNode("transmitter-effects", scene);
    const landmarks = [{ x: 431, y: 624, width: 42 }, { x: 709, y: 612, width: 75 }, { x: 1010, y: 588, width: 54 }, { x: 1290, y: 566, width: 70 }];
    const joins = landmarks.map(() => {
      const root = new TransformNode("joining-block", scene); root.parent = bridge;
      const block = cutStone("gap-stone", 1, .45, .5, scene); block.parent = root; block.material = stone;
      block.rotation.x = -.55;
      const seam = CreateBox("magic-edge", { width: 1, height: .05, depth: .02 }, scene);
      seam.parent = root; seam.material = teal; seam.position.set(0, -.24, -.3);
      return root;
    });
    const explorer = new TransformNode("walking-explorer", scene); explorer.parent = bridge;
    const body = CreateCylinder("cloak", { height: .8, diameterBottom: .56, diameterTop: .3, tessellation: 7 }, scene);
    body.material = cloak; body.parent = explorer; body.position.y = .5;
    const head = CreateSphere("hood", { diameter: .45, segments: 4 }, scene);
    head.material = hood; head.parent = explorer; head.position.y = 1.02;
    const bag = CreateBox("satchel", { width: .29, height: .32, depth: .18 }, scene);
    bag.material = brass; bag.parent = explorer; bag.position.set(-.17, .48, -.2);
    const feet = [-.13, .13].map(x => {
      const foot = CreateBox("boot", { width: .16, height: .28, depth: .23 }, scene);
      foot.material = boot; foot.parent = explorer; foot.position.set(x, .12, 0);
      return foot;
    });
    const circuits = Array.from({ length: 3 }, (_, i) => {
      const ring = CreateTorus("restored-circuit", { diameter: 220 + i * 26, thickness: 2.5, tessellation: 36 }, scene);
      ring.parent = machine; ring.material = teal; ring.rotation.x = Math.PI / 2;
      return ring;
    });
    const crystal = CreateIcoSphere("awakened-crystal", { radius: 18, subdivisions: 1, flat: true }, scene);
    crystal.material = teal; crystal.parent = machine;
    let world: WorldState = { stage: 1, bridgeSolved: false, repaired: 0, complete: false };
    let elapsed = 0;
    let width = 1, height = 1, scale = 1, cropX = 0, cropY = 0;
    const point = (x: number, y: number, z = 0) => new Vector3((x * scale - cropX) / width * 100, 100 - (y * scale - cropY) / height * 100, z);
    const layout = () => {
      width = Math.max(1, canvas.clientWidth); height = Math.max(1, canvas.clientHeight);
      scale = Math.max(width / 1536, height / 1024);
      cropX = (1536 * scale - width) * (world.stage === 1 ? .5 : .6);
      cropY = (1024 * scale - height) * (world.stage === 1 ? .12 : .38);
      joins.forEach((join, i) => {
        const landmark = landmarks[i]!;
        join.scaling.set(landmark.width * scale / width * 100, 28 * scale / height * 100, 1);
      });
      explorer.scaling.set(72 * scale / width * 100, 72 * scale / height * 100, 1);
      // The transmitter image places its central crystal at this landmark.
      circuits.forEach(ring => { ring.position.copyFrom(point(1048, 374)); ring.scaling.set(scale / width * 100, scale / height * 100, scale / height * 100); });
      crystal.position.copyFrom(point(1048, 374, -1)); crystal.scaling.set(scale / width * 100, scale / height * 100, scale / height * 100);
    };
    const observer = new ResizeObserver(layout);
    observer.observe(canvas); runtime.own(() => observer.disconnect()); layout();
    if (import.meta.dev) {
      const debugWindow = window as Window & { __caesar3d?: { resources: typeof runtimeResources; metrics: () => ReturnType<SceneRuntime["metrics"]> } };
      debugWindow.__caesar3d = { resources: runtimeResources, metrics: () => runtime.metrics() };
      runtime.own(() => { delete debugWindow.__caesar3d; });
    }
    runtime.run(dt => {
      if (world.bridgeSolved) elapsed += dt;
      const joined = world.bridgeSolved ? reducedMotion ? 1 : Math.min(1, elapsed / 1.1) : 0;
      joins.forEach((join, i) => {
        const landmark = landmarks[i]!;
        join.setEnabled(joined > 0);
        join.position.copyFrom(point(landmark.x, landmark.y + 45 * (1 - joined)));
        join.getChildMeshes().forEach(mesh => { mesh.visibility = joined; });
      });
      const crossed = world.bridgeSolved ? reducedMotion ? 1 : Math.max(0, Math.min(1, (elapsed - 1.1) / 2)) : 0;
      explorer.position.copyFrom(point(300 + crossed * 1090, 646 - crossed * 106, -2));
      feet.forEach((foot, i) => { foot.rotation.x = crossed > 0 && crossed < 1 ? Math.sin(elapsed * 14 + i * Math.PI) * .4 : 0; });
      circuits.forEach((ring, i) => { ring.visibility = world.repaired > i ? .3 : 0; });
      crystal.visibility = world.complete ? .5 : 0;
      if (!reducedMotion && world.complete) crystal.rotation.y += dt * .4;
    });
    return {
      update(next) { if (!next.bridgeSolved) elapsed = 0; world = next; bridge.setEnabled(next.stage === 1); machine.setEnabled(next.stage === 2); layout(); },
      quality: light => runtime.setQuality(light ? "low" : "high"),
      dispose: () => runtime.dispose(),
    };
  } catch (error) { runtime.dispose(); throw error; }
}
