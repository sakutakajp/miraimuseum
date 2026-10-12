import { describe, expect, it, vi } from "vitest";
import {
  BEAT,
  MUSIC_BARS,
  createMuseumMusic,
  noteFrequency,
  scheduleMusicBar,
} from "../app/museum/music";

function audio() {
  const oscillators: any[] = [],
    gains: any[] = [];
  const ctx = {
    currentTime: 0,
    destination: {},
    createGain: () => {
      const gain = {
        gain: {
          value: 0,
          setValueAtTime: vi.fn(),
          linearRampToValueAtTime: vi.fn(),
          exponentialRampToValueAtTime: vi.fn(),
        },
        connect: vi.fn(),
        disconnect: vi.fn(),
      };
      gains.push(gain);
      return gain;
    },
    createOscillator: () => {
      const oscillator = {
        frequency: { value: 0 },
        connect: vi.fn(),
        disconnect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
        onended: null,
      };
      oscillators.push(oscillator);
      return oscillator;
    },
    resume: vi.fn(async () => {}),
    suspend: vi.fn(async () => {}),
    close: vi.fn(async () => {}),
  };
  return { ctx: ctx as unknown as AudioContext, oscillators, gains };
}
describe("original opt-in music", () => {
  it("schedules finite, quiet notes with a repeatable score and cleanup", () => {
    const { ctx, oscillators, gains } = audio();
    const output = ctx.createGain();
    scheduleMusicBar(ctx, output, MUSIC_BARS.length, 0.04);
    expect(oscillators).toHaveLength(9);
    expect(oscillators[0].frequency.value).toBeCloseTo(noteFrequency(72));
    expect(oscillators[6].start).toHaveBeenCalledWith(0.04 + BEAT * 3);
    for (const oscillator of oscillators) {
      expect(oscillator.stop.mock.calls[0][0]).toBeGreaterThan(
        oscillator.start.mock.calls[0][0],
      );
      oscillator.onended(new Event("ended"));
      expect(oscillator.disconnect).toHaveBeenCalledOnce();
    }
    expect(gains[1].disconnect).toHaveBeenCalledOnce();
    expect(noteFrequency(69)).toBe(440);
  });
  it("creates no context until enabled and stops scheduling when hidden or muted", async () => {
    vi.useFakeTimers();
    try {
      const { ctx, oscillators } = audio();
      const factory = vi.fn(() => ctx);
      const player = createMuseumMusic(factory);
      expect(factory).not.toHaveBeenCalled();
      await player.setEnabled(true);
      expect(factory).toHaveBeenCalledOnce();
      expect(vi.getTimerCount()).toBe(1);
      await player.setHidden(true);
      expect(vi.getTimerCount()).toBe(0);
      expect(ctx.suspend).toHaveBeenCalledOnce();
      const count = oscillators.length;
      vi.advanceTimersByTime(10_000);
      expect(oscillators).toHaveLength(count);
      await player.setHidden(false);
      expect(factory).toHaveBeenCalledOnce();
      expect(vi.getTimerCount()).toBe(1);
      await player.setEnabled(false);
      expect(vi.getTimerCount()).toBe(0);
      await player.setHidden(false);
      expect(vi.getTimerCount()).toBe(0);
      player.dispose();
      expect(ctx.close).toHaveBeenCalledOnce();
      await player.setEnabled(true);
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });
  it("handles unavailable audio without leaving a timer", async () => {
    const player = createMuseumMusic(() => {
      throw new Error("unsupported");
    });
    await expect(player.setEnabled(true)).rejects.toThrow("Music unavailable");
    await player.setEnabled(false);
    player.dispose();
  });
});
