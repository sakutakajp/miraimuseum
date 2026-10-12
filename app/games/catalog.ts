export type GameId = "dinosaur-run" | "human-hunt" | "farm" | "rosetta" | "castle" | "sailing" | "factory" | "car-race" | "rocket" | "robot-arm" | "humanoid" | "space-delivery";
export interface GameDefinition {
  id: GameId; name: { ja: string; en: string }; exhibit: string;
  status: "playable" | "planned"; route?: string; stages: readonly { id: number; title: string }[];
}
import { stages as deliveryStages } from "../game/space-delivery/stages";
import { copy, textFor } from "../game/space-delivery/copy";
export const games: readonly GameDefinition[] = [
  { id: "dinosaur-run", name: { ja: "恐竜ラン", en: "Dinosaur run" }, exhibit: "dinosaur", status: "playable", route: "/dinosaur", stages: [{ id: 1, title: "Stage 1" }] },
  { id: "human-hunt", name: { ja: "人類の狩猟", en: "Human hunting" }, exhibit: "mammoth", status: "planned", stages: [] },
  { id: "farm", name: { ja: "農場", en: "Farm" }, exhibit: "farm", status: "planned", stages: [] },
  { id: "rosetta", name: { ja: "暗号の遺跡", en: "The Cipher Ruins" }, exhibit: "rosetta-stone", status: "playable", route: "/games/caesar", stages: [{ id: 1, title: "暗号の橋" }, { id: 2, title: "壊れた通信機" }] },
  { id: "castle", name: { ja: "中世の城", en: "Medieval castle" }, exhibit: "castle", status: "planned", stages: [] },
  { id: "sailing", name: { ja: "帆船", en: "Sailing" }, exhibit: "sailboat", status: "planned", stages: [] },
  { id: "factory", name: { ja: "工場", en: "Factory" }, exhibit: "factory", status: "planned", stages: [] },
  { id: "car-race", name: { ja: "車", en: "Car racing" }, exhibit: "cybertruck", status: "planned", stages: [] },
  { id: "rocket", name: { ja: "ロケット", en: "Rocket shooter" }, exhibit: "rocket", status: "planned", stages: [] },
  { id: "robot-arm", name: { ja: "ロボットアーム", en: "Robot arm crane" }, exhibit: "robot-arm", status: "planned", stages: [] },
  { id: "humanoid", name: { ja: "ヒューマノイドロボット", en: "Humanoid battle" }, exhibit: "humanoid", status: "planned", stages: [] },
  { id: "space-delivery", name: { ja: copy.title, en: "Space Cat Delivery" }, exhibit: "space-delivery", status: "playable", route: "/games/space-delivery/", stages: deliveryStages.map(stage => ({ id: stage.id, title: textFor(stage.nameKey) })) },
];
export const getGame = (id: GameId) => games.find(game => game.id === id)!;
export interface StageResult { game: GameId; stage: number; cleared: boolean; score: number; health: number; elapsed: number; stats?: { maxChain: number; near: number }; discoveries?: string[] }
