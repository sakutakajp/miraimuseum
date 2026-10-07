import { MUSIC_STEMS, SOUND_NAMES } from "./config/audio";

export async function loadDinosaurAudioBuffers(context: AudioContext, signal: AbortSignal) {
  const extension = new Audio().canPlayType('audio/ogg; codecs="vorbis"') ? "ogg" : "m4a";
  const entries = await Promise.all([...MUSIC_STEMS, ...SOUND_NAMES].map(async name => {
    const response = await fetch(`/deep-time/audio/${name}.${extension}`, { signal, priority: "low" });
    if (!response.ok) throw new Error(`Audio asset: ${name}`);
    const bytes = await response.arrayBuffer();
    signal.throwIfAborted();
    const buffer = await context.decodeAudioData(bytes);
    signal.throwIfAborted();
    return [name, buffer] as const;
  }));
  return new Map<string, AudioBuffer>(entries);
}
