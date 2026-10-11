/** Content is independent of the cipher and the progression reducer. */
export type QuestionKind = "decrypt" | "encrypt" | "repair" | "door";
export interface Question {
  id: QuestionKind;
  input: string;
  expected: string;
  source?: string;
  clue: { original: string; encrypted: string };
  title: string;
  inputLabel: string;
  resultLabel: string;
  instruction: string;
  skill: string;
  hints: string[];
  success: string;
  shift: number;
}
export const bridgePuzzles = [
  { input: "い", expected: "あ", instruction: "ここを おしてみよう", hint: "『1つ もどす』を おしてみよう", success: "あしばが できた！", shift: -1 },
  { input: "う", expected: "い", instruction: "『い』に あわせよう", hint: "『う』の まえは『い』だよ", success: "できた！ ミイも うれしそう", shift: -1 },
  { input: "うお", expected: "いえ", instruction: "ふたつとも いっしょに うごくよ", hint: "『う』を『い』に すると、もうひとつも うごくよ", success: "『いえ』に なったね！", shift: -1 },
  { input: "すひす", expected: "こねこ", instruction: "『こねこ』に あわせよう", hint: "『す』の まえを、ひとつずつ みてみよう", success: "できた！ いっしょに いこう！", shift: -3 },
] as const;
export const bridgePuzzle = bridgePuzzles[3];
export const questions: Question[] = [
  { id: "decrypt", input: "くかと", expected: "おうち", clue: { original: "あ", encrypted: "え" }, shift: -3,
    title: "おてがみを よもう", inputLabel: "とどいた もじ", resultLabel: "よめた ことば", instruction: "おてがみを よんでみよう", skill: "おてがみを よむ",
    hints: ["あ から え まで、いくつ すすむかな？", "よむ ときは、はんたいに うごかすよ"], success: "おうちからの おてがみだ！" },
  { id: "encrypt", input: "ここ", expected: "すす", clue: { original: "あ", encrypted: "え" }, shift: 3,
    title: "おへんじを おくろう", inputLabel: "おくる ことば", resultLabel: "できた もじ", instruction: "『ここ』に いるよって、つたえたい！", skill: "おへんじを おくる",
    hints: ["おくる ときは、もとの もじから すすむよ", "『こ』から、3つ すすめてみよう"], success: "むこうでも、もとに もどすと よめるんだね" },
  { id: "repair", input: "ひせ", expected: "ひす", source: "ねこ", clue: { original: "あ", encrypted: "え" }, shift: 3,
    title: "もじを なおそう", inputLabel: "つくった もじ", resultLabel: "たしかめた もじ", instruction: "まちがえた もじを えらぼう", skill: "ひとつの もじを なおす",
    hints: ["『こ』からも、3つ すすめてみよう"], success: "なおった！ おうちへ いこう！" },
  { id: "door", input: "えか", expected: "いえ", clue: { original: "あ", encrypted: "う" }, shift: -2,
    title: "さいごの とびら", inputLabel: "とどいた もじ", resultLabel: "よめた ことば", instruction: "あたらしい おてがみを よもう", skill: "さいごの とびら（あたらしい かぎ）",
    hints: ["あ から う まで、いくつ すすむかな？", "おてがみは、はんたいに うごかして よむよ"], success: "とびらが あいた！" },
];
