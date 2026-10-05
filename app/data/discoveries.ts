export const discoveries = [
  {
    id: "strata",
    name: "地層",
    reading: "ちそう",
    category: "地球の記録",
    sprite: "strata",
    color: "#ce8857",
    facts: [
      "地面のしましまは、長い時間の記録。",
      "砂や泥が積み重なって、地層ができる。",
      "ひっくり返っていなければ、下の地層ほど古い。",
    ],
    detail:
      "砂や泥などが積み重なってできた層。地層に残った化石から、昔の生き物や環境を調べられるよ。",
  },
  {
    id: "ammonite",
    name: "アンモナイト",
    reading: "",
    category: "海の化石",
    sprite: "ammonite",
    color: "#cb925e",
    facts: [
      "うずまきの殻を持つ、昔の海の生き物。",
      "アンモナイトは、イカやタコの仲間。",
      "恐竜と同じ時代の海にも、暮らしていた。",
    ],
    detail:
      "うずまきの殻を持つ、今は絶滅した生き物。殻の形は種類によってさまざま。化石は、地層の年代を知る手がかりにもなるよ。",
  },
  {
    id: "fossil",
    name: "ティラノサウルスの化石",
    reading: "かせき",
    category: "過去への入り口",
    sprite: "fossil",
    color: "#c5ad79",
    facts: [
      "化石は、大昔の生き物が残した手がかり。",
      "骨だけでなく、足あとも化石になる。",
      "化石を調べると、昔の生き物の姿がわかる。",
    ],
    detail:
      "化石は、昔の生き物の体や、足あとなどの痕跡が残ったもの。ティラノサウルスの骨の化石から、体の形や動き方を研究しているよ。",
  },
  {
    id: "fern",
    name: "シダ",
    reading: "",
    category: "みどりの世界",
    sprite: "fern",
    color: "#7e9e60",
    facts: [
      "シダは、花を咲かせない植物。",
      "種の代わりに、胞子で増える。",
      "恐竜のいた時代にも、シダの仲間が育っていた。",
    ],
    detail:
      "シダは花や種をつくらず、胞子で増える植物。葉の裏をよく見ると、胞子をつくる袋の集まりが見える種類もあるよ。",
  },
  {
    id: "triceratops",
    name: "トリケラトプス",
    reading: "",
    category: "白亜紀の仲間",
    sprite: "triceratops",
    color: "#889c80",
    facts: [
      "３本の角を持つ、植物を食べる恐竜。",
      "頭の後ろに、大きなえり飾りがある。",
      "ティラノサウルスと同じ時代に暮らしていた。",
    ],
    detail:
      "約6800万〜6600万年前の北アメリカで暮らした恐竜。くちばしのような口で植物を食べていたと考えられているよ。",
  },
  {
    id: "rex",
    name: "ティラノサウルス",
    reading: "",
    category: "大きな出会い",
    sprite: "rex",
    color: "#709184",
    facts: [
      "大きくて丈夫な歯を持つ、肉食の恐竜。",
      "においを感じる力が、発達していたと考えられる。",
      "約6800万〜6600万年前に暮らしていた。",
    ],
    detail:
      "白亜紀の終わりごろ、北アメリカに暮らした肉食恐竜。長いしっぽでバランスを取り、２本の後ろ足で歩いていたよ。",
  },
] as const;
export type DiscoveryId = (typeof discoveries)[number]["id"];
export const discoveryIds: readonly DiscoveryId[] = discoveries.map(
  (item) => item.id,
);
export function getDiscovery(id: DiscoveryId) {
  return discoveries.find((item) => item.id === id)!;
}
export function factFor(id: DiscoveryId, previousVisits: number) {
  const item = getDiscovery(id);
  return item.facts[
    Math.min(Math.max(0, previousVisits), item.facts.length - 1)
  ];
}
