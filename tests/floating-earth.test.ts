import { describe, expect, it } from "vitest";
import { EarthInteraction } from "../app/experiences/floating-earth/interaction";

const advance = (earth: EarthInteraction, seconds: number, fps: number) => {
  for (let step = 0; step < seconds * fps; step++) earth.update(1 / fps);
};

describe("floating Earth gestures", () => {
  it("distinguishes a slightly moving tap from a drag and turns once on release", () => {
    const earth = new EarthInteraction();
    earth.begin(100, 100, 0);
    earth.move(104, 103, 0.1, 400);
    expect(earth.active).toBe(true);
    expect(earth.dragging).toBe(false);
    expect(earth.yaw).toBe(0);
    expect(earth.end(0.12)).toBe("tap");
    expect(earth.end(0.12)).toBeNull();
    advance(earth, 4, 60);
    expect(earth.yaw).toBeCloseTo(Math.PI / 2, 4);
    expect(earth.moving).toBe(false);
  });

  it("keeps an out-and-back gesture classified as a drag", () => {
    const earth = new EarthInteraction();
    earth.begin(100, 100, 0);
    earth.move(140, 100, 0.1, 400);
    expect(earth.dragging).toBe(true);
    earth.move(100, 100, 0.2, 400);
    expect(earth.yaw).toBeCloseTo(0);
    expect(earth.end(0.4)).toBe("drag");
    advance(earth, 2, 60);
    expect(earth.yaw).toBeCloseTo(0);
  });

  it("does not fling a held drag when pointerup repeats its last coordinates", () => {
    const earth = new EarthInteraction();
    earth.begin(0, 0, 0);
    earth.move(90, 0, 0.1, 400);
    const heldYaw = earth.yaw;
    earth.move(90, 0, 0.3, 400);
    expect(earth.end(0.3)).toBe("drag");
    advance(earth, 2, 60);
    expect(earth.yaw).toBe(heldYaw);
    expect(earth.moving).toBe(false);
  });

  it("grabs a spinning Earth immediately and cancels without a tap or fling", () => {
    const earth = new EarthInteraction();
    earth.tap();
    earth.update(0.05);
    earth.begin(0, 0, 0.1);
    const grabbedYaw = earth.yaw;
    earth.update(0.1);
    expect(earth.yaw).toBe(grabbedYaw);
    earth.move(80, 0, 0.2, 400);
    const draggedYaw = earth.yaw;
    earth.cancel();
    expect(earth.end(0.3)).toBeNull();
    advance(earth, 2, 60);
    expect(earth.yaw).toBe(draggedYaw);
    expect(earth.active).toBe(false);
    expect(earth.moving).toBe(false);
  });

  it("maps rotation to the visible globe size rather than screen density", () => {
    const large = new EarthInteraction();
    const small = new EarthInteraction();
    large.begin(0, 0, 0);
    small.begin(0, 0, 0);
    large.move(100, 20, 0.1, 800);
    small.move(50, 10, 0.1, 400);
    expect(small.yaw).toBeCloseTo(large.yaw);
    expect(small.pitch).toBeCloseTo(large.pitch);
    expect(large.yaw).toBeCloseTo(Math.PI / 4);
  });

  it("continues a fresh flick with the same trajectory at 30, 60, and 120 fps", () => {
    const positions = [30, 60, 120].map((fps) => {
      const earth = new EarthInteraction();
      earth.begin(0, 0, 0);
      earth.move(90, -12, 0.1, 500);
      earth.move(170, -20, 0.2, 500);
      expect(earth.end(0.22)).toBe("drag");
      const releaseYaw = earth.yaw;
      advance(earth, 1, fps);
      expect(earth.yaw).toBeGreaterThan(releaseYaw);
      return [earth.yaw, earth.pitch];
    });
    for (const position of positions.slice(1)) {
      expect(position[0]).toBeCloseTo(positions[0]![0]!, 10);
      expect(position[1]).toBeCloseTo(positions[0]![1]!, 10);
    }
  });

  it("bounds vertical rotation without preventing a reverse drag", () => {
    const earth = new EarthInteraction();
    earth.begin(0, 0, 0);
    earth.move(0, 1_000, 0.1, 300);
    expect(earth.pitch).toBe(0.9);
    earth.move(0, 990, 0.2, 300);
    expect(earth.pitch).toBeLessThan(0.9);
    earth.move(0, -1_000, 0.3, 300);
    expect(earth.pitch).toBe(-0.9);
    earth.end(0.31);
    advance(earth, 1, 60);
    expect(earth.pitch).toBe(-0.9);
    earth.rotate(0, 10);
    expect(earth.pitch).toBe(0.9);
  });

  it("uses direct tap, drag, and keyboard rotation with reduced motion", () => {
    const earth = new EarthInteraction();
    earth.tap();
    earth.setReducedMotion(true);
    const initialYaw = earth.yaw;
    advance(earth, 1, 60);
    expect(earth.yaw).toBe(initialYaw);
    earth.begin(0, 0, 1);
    expect(earth.end(1.1)).toBe("tap");
    expect(earth.yaw).toBeCloseTo(initialYaw + Math.PI / 4);
    earth.begin(0, 0, 1.2);
    earth.move(80, 20, 1.3, 400);
    earth.end(1.31);
    const pose = [earth.yaw, earth.pitch];
    advance(earth, 2, 60);
    expect([earth.yaw, earth.pitch]).toEqual(pose);
    earth.rotate(-0.2, 0.1);
    expect(earth.yaw).toBeCloseTo(pose[0]! - 0.2);
    expect(earth.pitch).toBeCloseTo(pose[1]! + 0.1);
    expect(earth.moving).toBe(false);
  });

  it("resets position, capture, and momentum together", () => {
    const earth = new EarthInteraction();
    earth.rotate(4, 0.6);
    earth.tap();
    earth.begin(0, 0, 0);
    earth.move(80, 40, 0.1, 400);
    earth.reset();
    advance(earth, 2, 60);
    expect([earth.yaw, earth.pitch]).toEqual([0, 0]);
    expect(earth.active).toBe(false);
    expect(earth.end(0.2)).toBeNull();
  });

  it("rejects invalid measurements and limits a long frame after resume", () => {
    const earth = new EarthInteraction();
    earth.begin(NaN, 0, 0);
    expect(earth.active).toBe(false);
    earth.rotate(Infinity, 0);
    earth.tap();
    const start = earth.yaw;
    earth.update(NaN);
    earth.update(Infinity);
    earth.update(-1);
    expect(earth.yaw).toBe(start);
    const reference = new EarthInteraction();
    reference.tap();
    reference.update(0.1);
    earth.update(60);
    expect(earth.yaw).toBe(reference.yaw);
    earth.begin(0, 0, 0);
    earth.move(Infinity, 10, 0.1, 400);
    earth.move(10, 10, 0.1, 0);
    expect(earth.dragging).toBe(false);
    expect(Number.isFinite(earth.yaw)).toBe(true);
  });
});
