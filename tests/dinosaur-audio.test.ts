import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { prepareDinosaurAudio, takeDinosaurAudio } from "../app/game/dinosaur/audio-context";

class GestureAudioContext {
  state = "suspended";
  resume = vi.fn(async () => { this.state = "running"; });
  close = vi.fn(async () => { this.state = "closed"; });
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("AudioContext", GestureAudioContext);
});
afterEach(() => {
  takeDinosaurAudio();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

it("resumes within the hero gesture and hands ownership to exactly one game", () => {
  prepareDinosaurAudio();
  const context = takeDinosaurAudio() as unknown as GestureAudioContext;
  expect(context.resume).toHaveBeenCalledOnce();
  expect(context.state).toBe("running");
  expect(takeDinosaurAudio()).toBeUndefined();
  vi.advanceTimersByTime(120_000);
  expect(context.close).not.toHaveBeenCalled();
});

it("closes an unconsumed context when navigation fails instead of keeping audio alive", () => {
  const contexts: GestureAudioContext[] = [];
  vi.stubGlobal("AudioContext", class extends GestureAudioContext {
    constructor() { super(); contexts.push(this); }
  });
  prepareDinosaurAudio();
  prepareDinosaurAudio();
  expect(contexts).toHaveLength(1);
  vi.advanceTimersByTime(60_000);
  expect(contexts[0]!.close).toHaveBeenCalledOnce();
  expect(takeDinosaurAudio()).toBeUndefined();
});

it("does not block game navigation when the browser cannot create an audio context", () => {
  vi.stubGlobal("AudioContext", class { constructor() { throw new Error("Unavailable"); } });
  expect(prepareDinosaurAudio).not.toThrow();
  expect(takeDinosaurAudio()).toBeUndefined();
});
