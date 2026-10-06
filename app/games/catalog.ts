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
    title: "MIRAI: DEEP TIME",
    theme: "恐竜",
    style: "アクション",
    visual: "2D · RHYTHM",
    icon: "🦖",
    color: "#b7a68a",
    description:
      "6600万年前。恐竜時代、最後の日を走る。1入力、76.8秒のシネマティック・リズムアクション。",
    control: "タップでジャンプ",
    duration: "76.8 SEC",
    stages: [{ id: 1, title: "CRETACEOUS // LAST DAY" }],
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
