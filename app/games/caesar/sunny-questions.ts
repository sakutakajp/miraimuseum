export const practices = [
  {
    input: "い",
    expected: "あ",
    shift: -1,
    title: "まずは ひとつ",
    instruction: "ここを おしてみよう",
    hint: "『い』を 1つ もどすと『あ』。",
    min: -1,
    max: 0,
  },
  {
    input: "うお",
    expected: "いえ",
    shift: -1,
    title: "いっしょに うごく",
    instruction: "『いえ』に あわせよう",
    hint: "ふたつとも、1つ もどしてみよう。",
    min: -2,
    max: 1,
  },
  {
    input: "さのさ",
    expected: "こねこ",
    shift: -1,
    title: "てまえの とびら",
    instruction: "あいことば『こねこ』に しよう",
    hint: "『さ』の ひとつ まえは『こ』。",
    min: -45,
    max: 45,
  },
] as const;
export interface SunnyQuestion {
  id: string;
  kind: "prediction" | "decrypt" | "encrypt";
  title: string;
  input: string;
  expected: string;
  shift: number;
  clue: { original: string; changed: string };
  instruction: string;
  success: string;
  hints: string[];
  choices?: string[];
}
export const sunnyQuestions: SunnyQuestion[] = [
  {
    id: "predict-two",
    kind: "prediction",
    title: "かぎの うごきを あてよう",
    input: "か",
    expected: "く",
    shift: 2,
    clue: { original: "あ", changed: "う" },
    instruction: "おてほんと おなじ うごきで『か』は？",
    success: "か → き → く。かぎの うごきが わかった！",
    hints: [
      "あ から う までを みよう。",
      "あ → い → う。2つ すすむよ。",
      "ひとつずつ うごかして みよう。",
    ],
    choices: ["き", "く", "け"],
  },
  {
    id: "read-two",
    kind: "decrypt",
    title: "いつ ひらくのかな？",
    input: "へろ",
    expected: "ひる",
    shift: -2,
    clue: { original: "あ", changed: "う" },
    instruction: "じかんの ヒントを よもう。",
    success: "『ひる』に ひらくんだね。",
    hints: [
      "あ から う まで、いくつ うごく？",
      "つくる ときは 2つ すすむ。よむ ときは？",
      "さいしょの もじで ためしてみよう。",
    ],
  },
  {
    id: "last-three",
    kind: "decrypt",
    title: "さいごの あいことば",
    input: "くかと",
    expected: "おうち",
    shift: -3,
    clue: { original: "あ", changed: "え" },
    instruction: "この とびらの もじを よもう。",
    success: "ひらいた！",
    hints: [
      "こんどの おてほんは、あ → え。",
      "あ → い → う → え。よむ ときは はんたい。",
      "さいしょの もじで ためしてみよう。",
    ],
  },
];
