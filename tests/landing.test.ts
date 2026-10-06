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
