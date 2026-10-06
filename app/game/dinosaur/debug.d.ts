import type { DinosaurRunScene } from "./scenes/DinosaurRunScene";
declare global {
  interface Window {
    __deepTime?: DinosaurRunScene;
  }
}
export {};
