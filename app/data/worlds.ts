import type { DiscoveryId } from "./discoveries";

export type WorldId = "dinosaur" | "space" | "ocean";
export interface World {
  id: WorldId;
  index: string;
  name: string;
  subtitle: string;
  room: string;
  sprite: string;
  action: string;
  highlights: readonly DiscoveryId[];
  phases: Record<string, string>;
}
export const worlds: readonly World[] = [
  {
    id: "dinosaur",
    index: "01",
    name: "恐竜の世界",
    subtitle: "化石の向こうに、会いに行こう。",
    room: "恐竜と地球の展示室",
    sprite: "rex",
    action: "ジャンプ",
    highlights: ["fossil", "rex"],
    phases: {
      present: "化石の眠る大地",
      rewind: "時間をこえて",
      past: "白亜紀の森",
      chase: "大きな出会い",
      ending: "未来へつなぐ発見",
    },
  },
  {
    id: "space",
    index: "02",
    name: "宇宙の世界",
    subtitle: "星の海へ、ひとっとび。",
    room: "星と宇宙の展示室",
    sprite: "saturn",
    action: "噴射",
    highlights: ["earth", "blackhole"],
    phases: {
      start: "月から出発",
      middle: "惑星の通り道",
      deep: "星が生まれる場所",
      encounter: "ブラックホール",
      ending: "星の記録を博物館へ",
    },
  },
  {
    id: "ocean",
    index: "03",
    name: "海・深海の世界",
    subtitle: "青い世界の、その奥へ。",
    room: "海といのちの展示室",
    sprite: "whale",
    action: "泳ぐ",
    highlights: ["vent", "whale"],
    phases: {
      start: "光の届く海",
      middle: "青い海の旅",
      deep: "光の届かない深海",
      encounter: "大きなクジラ",
      ending: "海の記録を博物館へ",
    },
  },
];
export function getWorld(id: WorldId): World {
  return worlds.find((world) => world.id === id)!;
}
