import { afterEach, expect, it, vi } from "vitest";
import { Box3, BoxGeometry, Group, Mesh, MeshStandardMaterial, Texture, Vector3 } from "three";
import { GLTFLoader, type GLTF } from "three/addons/loaders/GLTFLoader.js";
import { discardPlayerModel, disposePlayerModel, normalizePlayerModel, preloadPlayerModel, takePlayerModel } from "../app/game/dinosaur/player-model";
import { CameraDirector } from "../app/game/dinosaur/systems/CameraDirector";
import { PLAYER_HEIGHT } from "../app/game/dinosaur/config/gameplay";

afterEach(() => { discardPlayerModel(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

it("fits an offset GLB to the collision height with its feet at the origin", () => {
  const scene = new Group();
  const body = new Mesh(new BoxGeometry(3, 7, 11), new MeshStandardMaterial());
  body.position.set(12, 19, -8); scene.add(body);
  const model = normalizePlayerModel(scene, "glb");
  const bounds = new Box3().setFromObject(model.object3D, true);
  expect(bounds.min.y).toBeCloseTo(0);
  expect(bounds.max.y).toBeCloseTo(PLAYER_HEIGHT);
  expect(bounds.getCenter(new Vector3()).x).toBeCloseTo(0);
  expect(bounds.getCenter(new Vector3()).z).toBeCloseTo(0);
  disposePlayerModel(model);
});

it("transfers the ready GLB once and leaves its resources alive until the game disposes them", async () => {
  const scene = new Group(), geometry = new BoxGeometry(2, 4, 6), texture = new Texture();
  const material = new MeshStandardMaterial({ map: texture });
  scene.add(new Mesh(geometry, material));
  const releaseGeometry = vi.spyOn(geometry, "dispose"), releaseTexture = vi.spyOn(texture, "dispose");
  vi.stubGlobal("fetch", vi.fn(async () => new Response(new ArrayBuffer(4))));
  vi.spyOn(GLTFLoader.prototype, "parseAsync").mockResolvedValue({ scene } as GLTF);
  const ready = await preloadPlayerModel(new AbortController().signal);
  const owned = await takePlayerModel(new AbortController().signal);
  expect(owned).toBe(ready);
  expect(fetch).toHaveBeenCalledOnce();
  discardPlayerModel();
  expect(releaseGeometry).not.toHaveBeenCalled();
  expect(releaseTexture).not.toHaveBeenCalled();
  disposePlayerModel(owned);
  expect(releaseGeometry).toHaveBeenCalledOnce();
  expect(releaseTexture).toHaveBeenCalledOnce();
});

it("uses an upright 3D placeholder when the GLB is unavailable", async () => {
  vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 404 })));
  const model = await takePlayerModel(new AbortController().signal);
  expect(model.source).toBe("placeholder");
  expect(model.bounds.min.y).toBeCloseTo(0);
  expect(model.bounds.max.y).toBeCloseTo(PLAYER_HEIGHT);
  expect(model.object3D.children.length).toBeGreaterThan(0);
  disposePlayerModel(model);
});

it("fits the full vertical scene and the player's highest jump above safe-area boundaries", () => {
  const director = new CameraDirector(true), safe = { top: 24, bottom: 34 };
  for (const [width, height] of [[390, 664], [430, 932], [844, 390], [1440, 900]]) {
    for (const section of ["calm", "predator", "fallout", "boundary"] as const) {
      const c = director.compose(width!, height!, 70, section, safe);
      const sceneryTop = c.floor - 604 * c.scale;
      const jumpTop = c.floor - (104 + PLAYER_HEIGHT) * c.scale;
      expect(sceneryTop).toBeGreaterThanOrEqual(safe.top - 1e-8);
      expect(jumpTop).toBeGreaterThan(safe.top);
      expect(c.floor).toBeLessThan(height! - safe.bottom);
    }
  }
});
