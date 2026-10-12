/** Hell Creek path is game fiction; scenery provenance is recorded separately. */
export const RUN_END = 2280;
export const RUN_DT = 1 / 120;
export const runObstacles = Array.from({ length: 9 }, (_, i) => ({
  id: i,
  x: 300 + i * 220,
  width: i % 3 === 1 ? 34 : 28,
  height: i % 3 === 1 ? 25 : 22,
  kind: i % 3 === 1 ? "root" : "stone",
}));
