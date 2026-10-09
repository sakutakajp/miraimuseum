export type GameId = "dinosaur-run";
export interface StageResult {
  game: GameId;
  stage: number;
  cleared: boolean;
  score: number;
  health: number;
  elapsed: number;
  stats?: { maxChain: number; near: number };
  discoveries?: string[];
}
export const games = [
  {
    id: "dinosaur-run" as GameId,
    title: "恐竜ゲーム",
    theme: "恐竜",
    style: "アクション",
    visual: "3D · RHYTHM",
    icon: "🦖",
    color: "#b7a68a",
    description:
      "6600万年前。恐竜時代、最後の日を走る。1入力、76.8秒のシネマティック・リズムアクション。",
    control: "タップでジャンプ",
    duration: "76.8 SEC",
    stages: [{ id: 1, title: "ステージ 1" }],
  },
];
export const getGame = (id: GameId) => games.find((g) => g.id === id)!;
