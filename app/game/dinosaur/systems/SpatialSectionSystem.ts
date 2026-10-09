import type { Level, Obstacle, TerrainSegment } from "../types";
export class SpatialSectionSystem {
  readonly chunkWidth = 400;
  private chunks = new Map<
    number,
    { obstacles: Obstacle[]; terrain: TerrainSegment[] }
  >();
  activeChunks = 0;
  constructor(level: Level) {
    for (const o of level.obstacles) this.chunk(o.x).obstacles.push(o);
    for (const t of level.terrain)
      for (let i = Math.floor(t.start / 400); i <= Math.floor(t.end / 400); i++)
        this.chunk(i * 400).terrain.push(t);
  }
  private chunk(x: number) {
    const index = Math.floor(x / 400);
    if (!this.chunks.has(index))
      this.chunks.set(index, { obstacles: [], terrain: [] });
    return this.chunks.get(index)!;
  }
  near(x: number, behind = 400, ahead = 1200) {
    const obstacles: Obstacle[] = [],
      terrain = new Set<TerrainSegment>();
    const from = Math.floor((x - behind) / 400),
      to = Math.floor((x + ahead) / 400);
    this.activeChunks = to - from + 1;
    for (let i = from; i <= to; i++) {
      const chunk = this.chunks.get(i);
      if (chunk) {
        obstacles.push(...chunk.obstacles);
        for (const t of chunk.terrain) terrain.add(t);
      }
    }
    return { obstacles, terrain: [...terrain] };
  }
  obstaclesAt(x: number) {
    return [
      this.chunks.get(Math.floor((x - 100) / 400)),
      this.chunks.get(Math.floor((x + 100) / 400)),
    ].flatMap((c, i, a) => (c && (i === 0 || c !== a[0]) ? c.obstacles : []));
  }
  terrainAt(x: number, at = Infinity): number | null {
    const t = this.chunks
      .get(Math.floor(x / 400))
      ?.terrain.find((t) => x >= t.start && x < t.end);
    return t?.gap && (t.collapseAt === undefined || at >= t.collapseAt)
      ? null
      : (t?.y ?? 0);
  }
}
