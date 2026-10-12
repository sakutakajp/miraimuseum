const smooth = (a: number, b: number, t: number) => {
  const x = Math.max(0, Math.min(1, (t - a) / (b - a))); return x * x * (3 - 2 * x);
};
export function revealAt(time: number, reduced: boolean) {
  const start = reduced ? 0.45 : 1.2, appear = reduced ? 0.55 : 1.95, finish = reduced ? 0.95 : 2.95, settle = reduced ? 1.15 : 3.5;
  const opacity = smooth(appear, finish, time);
  return { phase: time < start ? "waiting" : time < appear ? "light" : time < settle ? "revealing" : "settled",
    opacity, light: smooth(start, reduced ? 0.7 : 2.15, time) * (1 - 0.94 * smooth(finish - 0.15, settle, time)),
    scale: reduced ? 1 : 0.88 + 0.12 * (1 - (1 - opacity) ** 3) };
}
