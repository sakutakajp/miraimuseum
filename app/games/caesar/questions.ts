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

export const questions: Question[] = [
  { id: "decrypt", input: "GRJ", expected: "DOG", clue: { original: "A", encrypted: "D" }, ...copy.questions.decrypt },
  { id: "encrypt", input: "BOX", expected: "ERA", clue: { original: "A", encrypted: "D" }, ...copy.questions.encrypt },
  { id: "repair", input: "FDY", expected: "FDW", source: "CAT", clue: { original: "A", encrypted: "D" }, ...copy.questions.repair },
];
