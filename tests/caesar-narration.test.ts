import { describe, expect, it, vi } from "vitest";
import { createNarrator, type VoiceStatus } from "../app/games/caesar/narration";
function fixture(initialVoices: SpeechSynthesisVoice[] = []) {
  let voices = initialVoices;
  const listeners = new Set<() => void>();
  const synthesis = { getVoices: () => voices, cancel: vi.fn(), speak: vi.fn(),
    addEventListener: (_: string, cb: any) => listeners.add(cb), removeEventListener: (_: string, cb: any) => listeners.delete(cb) };
  const statuses: VoiceStatus[] = [];
  const narrator = createNarrator({ synthesis, utterance: text => ({ text } as SpeechSynthesisUtterance), status: s => statuses.push(s) });
  return { narrator, synthesis, statuses, listeners, setVoices(v: SpeechSynthesisVoice[]) { voices = v; listeners.forEach(cb => cb()); } };
}
const ja = { lang: "ja-JP", name: "Japanese", localService: true } as SpeechSynthesisVoice;
describe("optional Japanese narration", () => {
  it("waits for a user gesture, cancels previous speech, and uses Japanese readings", () => {
    const f = fixture([ja]); f.narrator.speak("ここを おしてみよう"); expect(f.synthesis.speak).not.toHaveBeenCalled();
    f.narrator.activate(); f.narrator.speak("3つ もどす");
    expect(f.synthesis.speak).toHaveBeenLastCalledWith(expect.objectContaining({ text: "みっつ もどす", lang: "ja-JP", voice: ja, rate: .85 }));
    f.narrator.speak("1つ すすめる"); expect(f.synthesis.cancel).toHaveBeenCalledTimes(3);
    expect(f.synthesis.speak.mock.calls.map(call => call[0].text)).toEqual(["みっつ もどす", "ひとつ すすめる"]);
    f.narrator.speak("43つ すすめる、42つ もどす、41つ すすめる");
    expect(f.synthesis.speak.mock.calls.at(-1)![0].text).toBe("43つ すすめる、42つ もどす、41つ すすめる");
  });
  it("detects missing Japanese voices and never substitutes an English voice", () => {
    const f = fixture([{ lang: "en-US" } as SpeechSynthesisVoice]); f.narrator.activate(); f.narrator.speak("こんにちは");
    expect(f.statuses).toEqual(["unavailable"]); expect(f.synthesis.speak).not.toHaveBeenCalled();
    f.setVoices([ja]); expect(f.statuses.at(-1)).toBe("ready"); expect(f.synthesis.speak).toHaveBeenCalledOnce();
  });
  it("does not play stale pending speech after a screen switch or while muted", () => {
    const f = fixture(); f.narrator.activate(); f.narrator.speak("まえの がめん"); f.narrator.stop(); f.setVoices([ja]);
    expect(f.synthesis.speak).not.toHaveBeenCalled();
    f.narrator.setEnabled(false); f.narrator.speak("よまない"); expect(f.synthesis.speak).not.toHaveBeenCalled();
    f.narrator.setEnabled(true); f.narrator.speak("いまの がめん"); expect(f.synthesis.speak).toHaveBeenCalledOnce();
    f.narrator.dispose(); expect(f.listeners.size).toBe(0); f.narrator.speak("よまない"); expect(f.synthesis.speak).toHaveBeenCalledOnce();
  });
  it("supports browsers without speech synthesis", () => {
    const status = vi.fn(); const f = createNarrator({ utterance: () => { throw new Error("should not run"); }, status });
    f.activate(); f.speak("もじだけで あそべる"); f.dispose(); expect(status).toHaveBeenCalledWith("unsupported");
  });
});
