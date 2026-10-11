export type ExhibitId = "sunny-room" | "forest-run" | "clockwork" | "future";
export interface Exhibit {
  id: ExhibitId;
  name: string;
  kind: "cipher" | "runner" | "gears" | "programming";
  available: boolean;
  route?: string;
  object: string;
  nap?: string;
  image?: string;
}
export const exhibits: Exhibit[] = [
  {
    id: "sunny-room",
    name: "ひだまりの へや",
    kind: "cipher",
    available: true,
    route: "/games/caesar",
    object: "ローマの おてがみ",
    nap: "ひだまりの クッション",
    image: "/museum/roman-nap.webp",
  },
  {
    id: "forest-run",
    name: "時空ねこの もりラン",
    kind: "runner",
    available: true,
    route: "/dinosaur",
    object: "きょうりゅうの ほね",
    nap: "もりの こかげ",
    image: "/museum/forest.webp",
  },
  {
    id: "clockwork",
    name: "とけいとう",
    kind: "gears",
    available: false,
    object: "ふるい とけい",
  },
  {
    id: "future",
    name: "みらいの こうぼう",
    kind: "programming",
    available: false,
    object: "ふしぎな はこ",
  },
];
export const historicalNotes = {
  roman: {
    place: "イタリア・ポンペイ / 前50年ごろ / 私邸の列柱式中庭（ペリスタイル）",
    fact: "ローマの いえには、はしらで かこまれた にわが あったよ。",
    cipher:
      "シーザーは、もじを ずらす おてがみを つかったと つたえられているよ。",
    invention: "ひらがなの もじばんと、ひらく とびらは、ゲームの くふうだよ。",
    estimate: "にわの いろや くさの ばしょは、しらべて かんがえた えだよ。",
    sources: [
      {
        name: "ポンペイ考古学公園：発掘案内（ファウヌスの家）",
        url: "https://pompeiisites.org/wp-content/uploads/A-Guide-to-the-Pompeii-Excavations-2.pdf",
      },
      {
        name: "Yale大学：ポンペイの住宅建築",
        url: "https://oyc.yale.edu/history-art/hsar-252/lecture-5",
      },
      {
        name: "Suetonius『Julius Caesar』56.6（Chicago大学）",
        url: "https://penelope.uchicago.edu/Thayer/E/Roman/Texts/Suetonius/12Caesars/Julius%2A.html#56",
      },
      {
        name: "Dickinson College：ラテン文字",
        url: "https://dcc.dickinson.edu/grammar/latin/alphabet",
      },
    ],
  },
  forest: {
    place: "現在の北米モンタナ州東部 / 約6650万年前 / ヘルクリーク層の河川低地",
    fact: "この ころ、ティラノサウルスや トリケラトプスが いたよ。",
    plants: "かわの そばには シダ、はなを さかせる きの なかまも いたよ。",
    invention: "ルゥの たびと、ジャンプする みちは、ゲームの くふうだよ。",
    estimate:
      "きょうりゅうの いろや もりの ならびは、そうぞうも まじえた えだよ。",
    sources: [
      {
        name: "AMNH：T. rex と Hell Creek の発見",
        url: "https://www.amnh.org/dinosaurs/tyrannosaurus-rex",
      },
      {
        name: "Smithsonian：Hell Creek の植物",
        url: "https://naturalhistory.si.edu/education/teaching-resources/paleontology/make-dinosaur-ecosystem-mural/plants",
      },
      {
        name: "Smithsonian：Hell Creek の地形と生態系",
        url: "https://profiles.si.edu/display/sro_137365",
      },
    ],
  },
};
