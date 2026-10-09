import type { Challenge, ClearResult, Rank } from "../types";
export function accuracy(delta: number) {
  return Math.max(0, Math.min(1, 1 - Math.abs(delta) / 0.22));
}
export function rankFor(score: number): Rank {
  return score >= 92000
    ? "S"
    : score >= 84000
      ? "A"
      : score >= 72000
        ? "B"
        : "C";
}
export class ScoreSystem {
  private matches = new Map<string, number>();
  constructor(private challenges: readonly Challenge[]) {}
  jump(at: number) {
    const c = this.challenges.find(
      (c) => !this.matches.has(c.id) && Math.abs(c.at - at) <= 0.3,
    );
    if (c) this.matches.set(c.id, accuracy(c.at - at));
  }
  get sync() {
    return this.challenges.length
      ? [...this.matches.values()].reduce((a, b) => a + b, 0) /
          this.challenges.length
      : 0;
  }
  result(attempts: number): ClearResult {
    const score = Math.min(100000, 60000 + Math.round(this.sync * 40000));
    return {
      stageId: "cretaceous-last-day",
      progress: 1,
      score,
      sync: this.sync,
      rank: rankFor(score),
      attempts,
    };
  }
  reset() {
    this.matches.clear();
  }
}
