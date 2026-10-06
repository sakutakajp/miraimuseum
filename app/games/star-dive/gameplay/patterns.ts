import type { TargetKind } from "../config";
export interface Spawn {
  time: number;
  kind: TargetKind | "asteroid";
  x: number;
  y: number;
  radius?: number;
}
export const patterns: Spawn[] = [];
function wave(time: number, x: number, y: number, count = 3) {
  for (let i = 0; i < count; i++)
    patterns.push({ time: time + i * 0.42, kind: "shard", x, y });
}
wave(14, 0, 0);
wave(17, -1.5, 0.7);
wave(20, 1.5, -0.6);
wave(23, 0, 0.2, 4);
for (let i = 0; i < 5; i++) {
  const time = 27 + i * 2.2;
  patterns.push({
    time,
    kind: "asteroid",
    x: i % 2 === 0 ? 0.95 : -1.4,
    y: i % 2 === 0 ? 0 : 0.7,
    radius: 0.5,
  });
  wave(time + 0.3, i % 2 === 0 ? 0 : 1.4, -0.3, 2);
}
patterns.push({ time: 40, kind: "asteroid", x: 0, y: 0, radius: 0.9 });
for (let i = 0; i < 3; i++) {
  patterns.push(
    { time: 42 + i * 2.5, kind: "asteroid", x: -0.8, y: 0, radius: 0.45 },
    { time: 42.9 + i * 2.5, kind: "asteroid", x: -2.6, y: 0, radius: 0.45 },
  );
  wave(42 + i * 2.5, -1.7, 0.2, 3);
  wave(43 + i * 2.5, 1.6, 0.1, 2);
}
patterns.push({ time: 49, kind: "core", x: 0, y: 0.5 });
for (let i = 0; i < 3; i++)
  patterns.push({
    time: 53.5 + i * 0.8,
    kind: "gate",
    x: (i - 1) * 1.4,
    y: i === 1 ? 0.35 : 0,
  });
wave(58, 0, 0, 4);
wave(61, -1, 0.4, 3);
wave(64, 1, -0.3, 3);
wave(68, 0, 0, 5);
patterns.push({ time: 70, kind: "core", x: 0, y: 0 });
patterns.sort((a, b) => a.time - b.time);
