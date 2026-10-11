import { copy } from "./copy";

export type QuestionKind = "decrypt" | "encrypt" | "repair";
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
}

export const bridgePuzzle = { input: "すひす", expected: "こねこ" };
export const questions: Question[] = [
  { id: "decrypt", input: "すおは", expected: "こいぬ", clue: { original: "あ", encrypted: "え" }, ...copy.questions.decrypt },
  { id: "encrypt", input: "えほん", expected: "きむう", clue: { original: "あ", encrypted: "え" }, ...copy.questions.encrypt },
  { id: "repair", input: "すひそ", expected: bridgePuzzle.input, source: bridgePuzzle.expected, clue: { original: "あ", encrypted: "え" }, ...copy.questions.repair },
];
