import { MUSIC_STEMS, SOUND_NAMES } from "./config/audio";
import { decodedAudio } from "../../three-d/audio";

export async function loadDinosaurAudioBuffers(context: AudioContext, signal: AbortSignal) {
  const extension = new Audio().canPlayType('audio/ogg; codecs="vorbis"') ? "ogg" : "m4a";
  const entries = await Promise.all([...MUSIC_STEMS, ...SOUND_NAMES].map(async name => {
    const buffer = await decodedAudio(`/deep-time/audio/${name}.${extension}`, context, signal);
    return [name, buffer] as const;
  }));
  return new Map<string, AudioBuffer>(entries);
}
