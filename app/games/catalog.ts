export type GameId = "dinosaur-run" | "star-flight";
export interface StageResult {
  game: GameId;
  stage: number;
  cleared: boolean;
  score: number;
  health: number;
  elapsed: number;
}
export const games = [
  {
    id: "dinosaur-run" as GameId,
    title: "恐竜ダッシュ",
    theme: "恐竜",
    style: "アクション",
    visual: "2D · PIXEL",
    icon: "🦖",
    color: "#ffb347",
    description:
      "恐竜の世界を走りぬけよう！タップでジャンプして、岩をこえよう。",
    control: "タップでジャンプ",
    duration: "45 SEC",
    stages: [{ id: 1, title: "太古の森" }],
  },
  {
    id: "star-flight" as GameId,
    title: "スターフライト",
    theme: "宇宙",
    style: "シューティング",
    visual: "3D · SPACE",
    icon: "🚀",
    color: "#9b8aff",
    description:
      "星の海へ出発！宇宙船をドラッグして、敵と隕石をかわそう。射撃は自動。",
    control: "ドラッグで移動",
    duration: "40 SEC",
    stages: [{ id: 1, title: "星の海" }],
  },
];
export const getGame = (id: GameId) => games.find((g) => g.id === id)!;
