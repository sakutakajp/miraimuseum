export const KANA_ROWS = ["あいうえお", "かきくけこ", "さしすせそ", "たちつてと", "なにぬねの", "はひふへほ", "まみむめも", "やゆよ", "らりるれろ", "わをん"];
export const KANA = KANA_ROWS.join("");
export const LETTER_COUNT = KANA.length;

export function wrapShift(value: number): number {
  return ((value % LETTER_COUNT) + LETTER_COUNT) % LETTER_COUNT;
}
export const isKanaLetter = (letter: string) => letter.length === 1 && KANA.includes(letter);

/** Positive shifts move forward; negative shifts move backward. */
export function shiftWord(word: string, shift: number): string {
  if (!word || ![...word].every(isKanaLetter) || !Number.isInteger(shift)) {
    throw new Error("Caesar cipher expects basic hiragana and an integer shift.");
  }
  return [...word].map(letter => KANA[wrapShift(KANA.indexOf(letter) + shift)]).join("");
}

export function replaceLetter(word: string, index: number, letter: string): string {
  if (!Number.isInteger(index) || index < 0 || index >= word.length || !isKanaLetter(letter)) return word;
  return word.slice(0, index) + letter + word.slice(index + 1);
}
