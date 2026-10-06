export type GameId = "dinosaur-run" | "star-flight";
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
    title: "MIRAI: STAR DIVE",
    theme: "宇宙",
    style: "シューティング",
    visual: "3D · SPACE",
    icon: "🚀",
    color: "#9b8aff",
    description:
      "小惑星帯をぬけろ。宇宙船をドラッグして、光る結晶をこわしながら、宇宙の奥へ。射撃は自動。",
    control: "ドラッグで移動",
    duration: "80 SEC",
    stages: [{ id: 1, title: "小惑星帯をぬけろ" }],
  },
];
export const getGame = (id: GameId) => games.find((g) => g.id === id)!;
