import type { StarDiveRuntime } from "../StarDiveRuntime";
export class VisualDirector {
  shake = 0;
  aberration = 0;
  flash = 0;
  bloom = 0.5;
  exposure = 1;
  beam = 0;
  update(runtime: StarDiveRuntime, reduced: boolean) {
    const time = runtime.clock.time;
    const recent = runtime.events.filter((e) => time - e.time < 0.22);
    this.shake = reduced
      ? 0
      : recent.reduce(
          (v, e) =>
            Math.max(
              v,
              e.kind === "damage"
                ? 0.1
                : e.kind === "near"
                  ? 0.055
                  : e.kind === "destroy"
                    ? 0.035
                    : 0,
            ),
          0,
        );
    this.aberration = reduced
      ? 0
      : recent.some((e) => ["near", "damage", "gate"].includes(e.kind))
        ? 0.0025
        : 0;
    this.flash = reduced
      ? 0
      : recent.some((e) => e.kind === "damage")
        ? 0.15
        : 0;
    this.beam = time >= 70 && time < 77 ? Math.min(1, (time - 70) / 2) : 0;
    this.bloom = runtime.director.section === "inside" ? 0.75 : 0.45;
    this.bloom += Math.max(0, runtime.score.risk - 1) * 0.08;
    this.exposure = time > 78 ? 1 + (time - 78) * 0.8 : 1;
  }
}
