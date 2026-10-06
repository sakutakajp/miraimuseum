import type { TargetKind } from "../config";
export class ScoreSystem {
  score = 0;
  chain = 0;
  maxChain = 0;
  nearCount = 0;
  risk = 1;
  lastDestroy = -Infinity;
  update(time: number) {
    if (time - this.lastDestroy > 1.5) this.chain = 0;
  }
  destroy(kind: TargetKind, time: number) {
    this.update(time);
    this.chain++;
    this.maxChain = Math.max(this.chain, this.maxChain);
    this.lastDestroy = time;
    const points = Math.round(
      { shard: 100, core: 300, gate: 500 }[kind] *
        (1 + Math.min(this.chain, 20) * 0.05) *
        this.risk,
    );
    this.score += points;
    return points;
  }
  damage() {
    this.chain = 0;
    this.risk = 1;
    this.nearStreak = 0;
  }
  private nearStreak = 0;
  recordNear() {
    this.nearCount++;
    this.nearStreak++;
    this.risk = Math.min(3, 1 + this.nearStreak * 0.5);
  }
  clear(shield: number) {
    this.score += shield * 2000;
  }
}
