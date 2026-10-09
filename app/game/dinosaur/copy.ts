import type { Locale } from "../../i18n";
import type { Rank } from "./types";

const copy = {
  ja: {
    start: "スタート", pause: "一時停止", resume: "続ける", home: "ホームへ戻る", retry: "もう一度",
    soundOn: "音声 オン", soundOff: "音声 オフ",
    metadata: "6600万年前 · 150 BPM · 48小節", jumpHint: "タップ / Space / ↑",
    pauseCaption: "時間を止めています", pausedTitle: "一時停止", completeTitle: "クリア", newBest: "ベスト更新",
    loading: "読み込み中...", failed: "読み込めませんでした", noStorage: "この端末では記録を保存できません。",
    gameAria: "恐竜ゲーム。ブラキオサウルスを操作。タップ、クリック、Space、↑でジャンプ。Escapeで一時停止。",
    attempt: (n: number) => `挑戦 ${String(n).padStart(2, "0")}`,
    attemptBest: (n: number, best: number) => `挑戦 ${String(n).padStart(2, "0")} / ベスト ${best}%`,
    clearDetails: (sync: number, n: number) => `到達率 100%     同期率 ${sync}%\n挑戦 ${n}回`,
    scoreRank: (rank: Rank) => `スコア / ランク ${rank}`,
    result: (score: number, sync: number, rank: Rank) => `クリア。スコア ${score}。同期率 ${sync}%。ランク ${rank}。`,
  },
  en: {
    start: "Start", pause: "Pause", resume: "Resume", home: "Return home", retry: "Run again",
    soundOn: "Sound on", soundOff: "Sound off",
    metadata: "66.0 Ma · 150 BPM · 48 BARS", jumpHint: "TAP / SPACE / ↑",
    pauseCaption: "TIME SUSPENDED", pausedTitle: "PAUSED", completeTitle: "RUN COMPLETE", newBest: "NEW BEST",
    loading: "Loading...", failed: "Unable to load the experience", noStorage: "Records cannot be saved on this device.",
    gameAria: "Dinosaur game. Play as a Brachiosaurus. Tap, click, Space or Up to jump. Escape to pause.",
    attempt: (n: number) => `ATTEMPT ${String(n).padStart(2, "0")}`,
    attemptBest: (n: number, best: number) => `ATTEMPT ${String(n).padStart(2, "0")} / BEST ${best}%`,
    clearDetails: (sync: number, n: number) => `CLEAR 100%     SYNC ${sync}%\nATTEMPTS ${n}`,
    scoreRank: (rank: Rank) => `RUN SCORE / RANK ${rank}`,
    result: (score: number, sync: number, rank: Rank) => `RUN COMPLETE. SCORE ${score}. SYNC ${sync}%. RANK ${rank}`,
  },
};

export function gameCopy(locale: Locale) { return copy[locale]; }
