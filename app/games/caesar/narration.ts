export type VoiceStatus = "unsupported" | "unavailable" | "ready";
interface NarrationOptions {
  synthesis?: Pick<SpeechSynthesis, "getVoices" | "speak" | "cancel" | "addEventListener" | "removeEventListener">;
  utterance: (text: string) => SpeechSynthesisUtterance;
  status: (status: VoiceStatus) => void;
}
/** One utterance at a time, and no automatic speech before a user gesture. */
export function createNarrator(options: NarrationOptions) {
  const synth = options.synthesis;
  let enabled = true, activated = false, disposed = false;
  let voice: SpeechSynthesisVoice | undefined;
  let pendingText = "";
  const refresh = () => {
    if (disposed) return;
    const japanese = synth?.getVoices().filter(v => /^ja(?:[-_]|$)/i.test(v.lang)) || [];
    voice = japanese.find(v => v.localService) || japanese[0];
    options.status(!synth ? "unsupported" : voice ? "ready" : "unavailable");
    if (voice && pendingText && enabled && activated) speak(pendingText);
  };
  function stop() { pendingText = ""; synth?.cancel(); }
  function speak(text: string) {
    stop();
    if (disposed || !enabled || !activated || !synth) return;
    if (!voice) { pendingText = text; return; }
    const readings: Record<string, string> = { "1": "ひとつ", "2": "ふたつ", "3": "みっつ" };
    const spoken = text.replace(/(^|[^0-9])([123])つ/g, (_, prefix: string, count: string) => prefix + readings[count]);
    const utterance = options.utterance(spoken);
    utterance.lang = "ja-JP";
    utterance.voice = voice;
    utterance.rate = .85;
    synth.speak(utterance);
  }
  synth?.addEventListener("voiceschanged", refresh);
  refresh();
  return {
    activate() { activated = true; },
    speak, stop,
    setEnabled(value: boolean) { enabled = value; if (!value) stop(); },
    dispose() { disposed = true; stop(); synth?.removeEventListener("voiceschanged", refresh); },
  };
}
