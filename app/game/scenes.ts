import { DinosaurScene } from "./DinosaurScene";
import { VoyageScene } from "./VoyageScene";
import type { SceneHooks } from "./scene-types";
import type { WorldId } from "../data/worlds";
export function createScene(world: WorldId, hooks: SceneHooks, level = 1) {
  return world === "dinosaur"
    ? new DinosaurScene(hooks, level)
    : new VoyageScene(world, hooks);
}
