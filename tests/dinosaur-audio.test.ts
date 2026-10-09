import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { prepareDinosaurAudio, takeDinosaurAudio, preloadDinosaurAudio, discardDinosaurAudio } from "../app/game/dinosaur/audio-context";
import { AudioDirector } from "../app/game/dinosaur/systems/AudioDirector";
import { clearAudioCache } from "../app/three-d/audio";

class GestureAudioContext {
  state = "suspended";
  resume = vi.fn(async () => { this.state = "running"; });
  close = vi.fn(async () => { this.state = "closed"; });
  decodeAudioData = vi.fn(async () => ({ duration: 76.8 }) as AudioBuffer);
  destination = {};
  createGain = vi.fn(() => ({ gain: { value: 0 }, connect: vi.fn(), disconnect: vi.fn() }));
  createDynamicsCompressor = vi.fn(() => ({
    threshold: { value: 0 }, ratio: { value: 0 }, connect: vi.fn(), disconnect: vi.fn(),
  }));
}

beforeEach(() => {
  clearAudioCache();
  vi.useFakeTimers();
  vi.stubGlobal("AudioContext", GestureAudioContext);
  vi.stubGlobal("Audio", class { canPlayType() { return "probably"; } });
});
afterEach(() => {
  discardDinosaurAudio();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

it("resumes within the hero gesture and hands ownership to exactly one game", () => {
  prepareDinosaurAudio();
  const context = takeDinosaurAudio()!.context as unknown as GestureAudioContext;
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

it("decodes silently on Earth and gives the ready buffers to the game without another download", async () => {
  const contexts: GestureAudioContext[] = [];
  vi.stubGlobal("AudioContext", class extends GestureAudioContext {
    constructor() { super(); contexts.push(this); }
  });
  vi.stubGlobal("fetch", vi.fn(async () => new Response(new ArrayBuffer(4))));
  await preloadDinosaurAudio(new AbortController().signal);
  const context = contexts[0]!;
  expect(context.state).toBe("suspended");
  expect(context.resume).not.toHaveBeenCalled();
  expect(context.decodeAudioData).toHaveBeenCalledTimes(11);
  prepareDinosaurAudio();
  const game = new AudioDirector();
  await game.load();
  expect(fetch).toHaveBeenCalledTimes(11);
  expect(contexts).toHaveLength(1);
  expect(context.state).toBe("running");
  vi.advanceTimersByTime(120_000);
  expect(context.close).not.toHaveBeenCalled();
  game.dispose();
  expect(context.close).toHaveBeenCalledOnce();
});

it("retries in the game after a temporary background audio failure", async () => {
  vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 503 })));
  await expect(preloadDinosaurAudio(new AbortController().signal)).rejects.toThrow("Audio asset");
  vi.stubGlobal("fetch", vi.fn(async () => new Response(new ArrayBuffer(4))));
  prepareDinosaurAudio();
  const game = new AudioDirector();
  await expect(game.load()).resolves.toBeUndefined();
  expect(fetch).toHaveBeenCalledTimes(11);
  game.dispose();
});

it("cancels an unused preload and closes its suspended context when leaving Earth", async () => {
  const contexts: GestureAudioContext[] = [];
  vi.stubGlobal("AudioContext", class extends GestureAudioContext {
    constructor() { super(); contexts.push(this); }
  });
  const signal = new AbortController();
  vi.stubGlobal("fetch", vi.fn((_url, options: RequestInit) => new Promise((_resolve, reject) => {
    options.signal!.addEventListener("abort", () => reject(new DOMException("Cancelled", "AbortError")), { once: true });
  })));
  const pending = preloadDinosaurAudio(signal.signal);
  signal.abort();
  discardDinosaurAudio();
  await expect(pending).rejects.toMatchObject({ name: "AbortError" });
  expect(contexts[0]!.close).toHaveBeenCalledOnce();
  expect(takeDinosaurAudio()).toBeUndefined();
});
