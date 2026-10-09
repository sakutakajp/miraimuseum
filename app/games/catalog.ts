export type GameId = "dinosaur-run" | "human-hunt" | "farm" | "rosetta" | "castle" | "sailing" | "factory" | "car-race" | "rocket" | "robot-arm" | "humanoid";
export interface GameDefinition {
  id: GameId; name: { ja: string; en: string }; exhibit: string;
  status: "playable" | "planned"; route?: string; stages: readonly { id: number; title: string }[];
}
export const games: readonly GameDefinition[] = [
  { id: "dinosaur-run", name: { ja: "恐竜ラン", en: "Dinosaur run" }, exhibit: "dinosaur", status: "playable", route: "/dinosaur", stages: [{ id: 1, title: "Stage 1" }] },
  { id: "human-hunt", name: { ja: "人類の狩猟", en: "Human hunting" }, exhibit: "mammoth", status: "planned", stages: [] },
  { id: "farm", name: { ja: "農場", en: "Farm" }, exhibit: "farm", status: "planned", stages: [] },
  { id: "rosetta", name: { ja: "ロゼッタストーン", en: "Rosetta Stone" }, exhibit: "rosetta-stone", status: "planned", stages: [] },
  { id: "castle", name: { ja: "中世の城", en: "Medieval castle" }, exhibit: "castle", status: "planned", stages: [] },
  { id: "sailing", name: { ja: "帆船", en: "Sailing" }, exhibit: "sailboat", status: "planned", stages: [] },
  { id: "factory", name: { ja: "工場", en: "Factory" }, exhibit: "factory", status: "planned", stages: [] },
  { id: "car-race", name: { ja: "車", en: "Car racing" }, exhibit: "cybertruck", status: "planned", stages: [] },
  { id: "rocket", name: { ja: "ロケット", en: "Rocket shooter" }, exhibit: "rocket", status: "planned", stages: [] },
  { id: "robot-arm", name: { ja: "ロボットアーム", en: "Robot arm crane" }, exhibit: "robot-arm", status: "planned", stages: [] },
  { id: "humanoid", name: { ja: "ヒューマノイドロボット", en: "Humanoid battle" }, exhibit: "humanoid", status: "planned", stages: [] },
];
export const getGame = (id: GameId) => games.find(game => game.id === id)!;
export interface StageResult { game: GameId; stage: number; cleared: boolean; score: number; health: number; elapsed: number; stats?: { maxChain: number; near: number }; discoveries?: string[] }
