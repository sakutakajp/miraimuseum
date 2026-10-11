export const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

export function wrap26(value: number): number {
  return ((value % 26) + 26) % 26;
}

/** Positive shifts move forward; negative shifts move backward. */
export function shiftWord(word: string, shift: number): string {
  if (!/^[A-Z]+$/.test(word) || !Number.isInteger(shift)) {
    throw new Error("Caesar cipher expects uppercase A–Z and an integer shift.");
  }
  return [...word].map(letter => ALPHABET[wrap26(ALPHABET.indexOf(letter) + shift)]).join("");
}

export function replaceLetter(word: string, index: number, letter: string): string {
  if (!Number.isInteger(index) || index < 0 || index >= word.length || !/^[A-Z]$/.test(letter)) return word;
  return word.slice(0, index) + letter + word.slice(index + 1);
}
