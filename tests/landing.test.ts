import { describe, expect, it } from "vitest";
import {
  boneTransition,
  clamp,
  damp,
  dampScroll,
  mapProgress,
  preserveProgressOnResize,
} from "../app/experiences/landing/math";
import { QualityManager } from "../app/experiences/landing/QualityManager";
import {
  earthObservation,
  figureWeights,
} from "../app/experiences/landing/earth";

const scaleVh = (progress: number) => 1 + 2.6 * progress;

describe("Earth observation choreography", () => {
  it("retains an intact Earth through the four observations and their connected overlap", () => {
    for (const progress of [0, 0.1, 0.28, 0.48, 0.7, 0.83, 0.86]) {
      expect(earthObservation(scaleVh(progress)).dissolve).toBe(0);
    }
    const connected = earthObservation(scaleVh(0.85));
    for (const layer of ["life", "matter", "machine", "connected"] as const) {
      expect(connected[layer]).toBeGreaterThan(0);
    }
    expect(connected.light).toBeGreaterThan(earthObservation(0).light);
    expect(earthObservation(scaleVh(0.95)).dissolve).toBeGreaterThan(0);
    expect(earthObservation(3.6).dissolve).toBe(1);
  });

  it("reveals distinct surface observations without changing the globe into another object", () => {
    expect(earthObservation(scaleVh(0.28)).life).toBeGreaterThan(
      earthObservation(scaleVh(0.1)).life,
    );
    expect(earthObservation(scaleVh(0.48)).matter).toBeGreaterThan(
      earthObservation(scaleVh(0.28)).matter,
    );
    expect(earthObservation(scaleVh(0.7)).machine).toBeGreaterThan(
      earthObservation(scaleVh(0.48)).machine,
    );
  });

  it("clamps all layer weights and remains deterministic when reversing or skipping scroll", () => {
    const positions = [NaN, -8, 0, 0.5, 1, 1.9, 2.6, 3.2, 3.5, 3.6, 5.2, 20];
    const snapshots = positions.map((vh) => earthObservation(vh));
    for (const [index, vh] of positions.entries()) {
      for (const value of Object.values(snapshots[index]!)) {
        expect(Number.isFinite(value)).toBe(true);
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(1);
      }
      expect(earthObservation(vh)).toEqual(snapshots[index]);
    }
    for (let index = positions.length - 1; index >= 0; index--) {
      expect(earthObservation(positions[index]!)).toEqual(snapshots[index]);
    }
  });

  it("preserves delayed breakup and connected layers with reduced motion", () => {
    const connected = earthObservation(scaleVh(0.85), true);
    expect(connected.dissolve).toBe(0);
    expect(connected.connected).toBeGreaterThan(0);
    expect(connected.life).toBeGreaterThan(0);
    expect(connected.matter).toBeGreaterThan(0);
    expect(connected.machine).toBeGreaterThan(0);
    expect(earthObservation(3.6, true).dissolve).toBe(1);
  });

  it("gives the same particles several connected structures with bounded continuous blends", () => {
    const forms = new Set<string>();
    const snapshots = new Map<number, ReturnType<typeof figureWeights>>();
    let previous = figureWeights(3.6);
    for (let step = 0; step <= 160; step++) {
      const vh = 3.6 + step / 100;
      const weights = figureWeights(vh);
      snapshots.set(vh, weights);
      expect(
        Object.values(weights).reduce((sum, value) => sum + value, 0),
      ).toBeCloseTo(1);
      const dominant = Object.entries(weights).reduce((best, entry) =>
        entry[1] > best[1] ? entry : best,
      );
      forms.add(dominant[0]);
      for (const key of Object.keys(weights) as (keyof typeof weights)[]) {
        expect(weights[key]).toBeGreaterThanOrEqual(0);
        expect(weights[key]).toBeLessThanOrEqual(1);
        expect(Math.abs(weights[key] - previous[key])).toBeLessThan(0.3);
      }
      expect(figureWeights(vh)).toEqual(weights);
      previous = weights;
    }
    expect([...forms].sort()).toEqual([
      "contour",
      "crystal",
      "life",
      "network",
      "orbit",
    ]);
    for (const [vh, weights] of [...snapshots].reverse()) {
      expect(figureWeights(vh)).toEqual(weights);
    }
  });
});

describe("landing timeline", () => {
  it("settles on exact scene boundaries in both scroll directions", () => {
    for (const target of [1, 3.6, 5.2]) {
      for (const initial of [0, 5.2]) {
        let progress = initial;
        for (let frame = 0; frame < 180; frame++)
          progress = dampScroll(progress, target, 12, 1 / 60);
        expect(progress).toBe(target);
        expect(mapProgress(progress).scene).toBe(
          target === 1 ? "scale-shift" : "connected",
        );
      }
    }
  });
  it.each([
    [-2, "threshold", 0],
    [0, "threshold", 0],
    [0.5, "threshold", 0.5],
    [1, "scale-shift", 0],
    [2.3, "scale-shift", 0.5],
    [3.6, "connected", 0],
    [4.4, "connected", 0.5],
    [5.2, "connected", 1],
    [20, "connected", 1],
  ])(
    "maps %s viewport heights without device-dependent boundaries",
    (vh, scene, local) => {
      const state = mapProgress(vh as number);
      expect(state.scene).toBe(scene);
      expect(state.sceneProgress).toBeCloseTo(local as number);
      expect(state.globalProgress).toBeGreaterThanOrEqual(0);
      expect(state.globalProgress).toBeLessThanOrEqual(1);
    },
  );
  it("treats invalid measurements as the complete opening", () => {
    expect(clamp(NaN)).toBe(0);
    expect(mapProgress(NaN).scene).toBe("threshold");
  });
  it("damping never overshoots after resume and is independent of frame subdivision", () => {
    expect(damp(0, 1, 12, 60)).toBeGreaterThan(0);
    expect(damp(0, 1, 12, 60)).toBeLessThan(1);
    expect(damp(damp(0, 1, 12, 1 / 60), 1, 12, 1 / 60)).toBeCloseTo(
      damp(0, 1, 12, 1 / 30),
    );
    expect(damp(1, 0, 12, 60)).toBeGreaterThan(0);
  });
  it("black/bone resolution is reversible and shared by both rendering layers", () => {
    expect(boneTransition(3.6)).toBe(0);
    expect(boneTransition(3.824)).toBe(1);
    expect(boneTransition(3.712)).toBeCloseTo(0.5);
    expect(boneTransition(0)).toBe(0);
  });
  it("preserves scene position when mobile browser chrome changes the viewport", () => {
    const next = preserveProgressOnResize(844 * 2.4, 844, 780);
    expect(mapProgress(next / 780)).toEqual(mapProgress(2.4));
    expect(preserveProgressOnResize(100, 0, 780)).toBe(100);
  });
});
describe("landing quality policy", () => {
  const frames = (quality: QualityManager, duration: number, delta: number) => {
    for (let t = 0; t < duration; t += delta) quality.sample(delta);
  };
  it("starts with device-appropriate limits and reduces resolution before detail", () => {
    const desktop = new QualityManager({
      mobile: false,
      cores: 8,
      reducedMotion: false,
    });
    expect(desktop.tier).toBe("high");
    expect(desktop.pixelRatio(3)).toBe(1.75);
    frames(desktop, 8, 1 / 30);
    expect(desktop.tier).toBe("high");
    expect(desktop.pixelRatio(3)).toBeLessThan(1.75);
    frames(desktop, 5, 1 / 30);
    expect(desktop.tier).toBe("medium");
    expect(
      new QualityManager({ mobile: true, cores: 6, reducedMotion: false }).tier,
    ).toBe("medium");
    expect(
      new QualityManager({ mobile: true, cores: 2, reducedMotion: true }).tier,
    ).toBe("static");
  });
  it("ignores isolated stalls and never upgrades after sustained poor performance", () => {
    const manager = new QualityManager({
      mobile: false,
      cores: 8,
      reducedMotion: false,
    });
    frames(manager, 10, 1 / 60);
    manager.sample(8);
    expect(manager.tier).toBe("high");
    frames(manager, 30, 1 / 30);
    const rank = ["high", "medium", "low", "static"].indexOf(manager.tier);
    expect(rank).toBeGreaterThan(0);
    frames(manager, 30, 1 / 120);
    expect(["high", "medium", "low", "static"].indexOf(manager.tier)).toBe(
      rank,
    );
    manager.fallback();
    frames(manager, 10, 1 / 60);
    expect(manager.tier).toBe("static");
  });
  it("does not increase actual DPR when a detail downgrade follows a resolution downgrade", () => {
    const manager = new QualityManager({
      mobile: false,
      cores: 8,
      reducedMotion: false,
    });
    let previous = manager.pixelRatio(1);
    for (let second = 0; second < 40; second++) {
      frames(manager, 1, 1 / 30);
      const next = manager.pixelRatio(1);
      expect(next).toBeLessThanOrEqual(previous);
      previous = next;
    }
    expect(manager.tier).toBe("static");
  });
  it("degrades persistent long frames instead of treating every weak-GPU frame as an isolated stall", () => {
    const manager = new QualityManager({
      mobile: true,
      cores: 4,
      reducedMotion: false,
    });
    for (let frame = 0; frame < 120; frame++) manager.sample(0.5);
    expect(manager.tier).toBe("static");
  });
});
