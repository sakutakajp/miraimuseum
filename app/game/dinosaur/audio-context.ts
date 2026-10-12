import { runtimeResources } from "../../three-d/diagnostics";
import { loadDinosaurAudioBuffers } from "./audio-assets";

export interface PreparedDinosaurAudio {
  context: AudioContext;
  abort: AbortController;
  buffers?: Promise<Map<string, AudioBuffer>>;
}

let prepared: PreparedDinosaurAudio | undefined;
let expiry: ReturnType<typeof setTimeout> | undefined;

function preparedAudio() {
  if (!prepared || prepared.context.state === "closed") {
    prepared = { context: new AudioContext(), abort: new AbortController() };
    runtimeResources.audioContexts++;
  }
  return prepared;
}

/** Decode silently while Earth is visible; playback still needs the user's tap. */
export async function preloadDinosaurAudio(signal: AbortSignal) {
  signal.throwIfAborted();
  const audio = preparedAudio();
  signal.addEventListener("abort", () => audio.abort.abort(), { once: true });
  audio.buffers ??= loadDinosaurAudioBuffers(audio.context, audio.abort.signal);
  const buffers = audio.buffers;
  try { await buffers; }
  catch (error) {
    if (audio.buffers === buffers) audio.buffers = undefined;
    throw error;
  }
}

/** Resume during the Earth tap so Safari can retain activation across the route. */
export function prepareDinosaurAudio() {
  if (typeof AudioContext === "undefined") return;
  try {
    const audio = preparedAudio();
    void audio.context.resume().catch(() => {});
    if (expiry) clearTimeout(expiry);
    expiry = setTimeout(discardDinosaurAudio, 60_000);
  } catch { /* Navigation remains available if audio activation is unavailable. */ }
}

export function takeDinosaurAudio() {
  if (expiry) clearTimeout(expiry);
  expiry = undefined;
  const audio = prepared;
  prepared = undefined;
  return audio?.context.state === "closed" ? undefined : audio;
}

export function discardDinosaurAudio() {
  if (expiry) clearTimeout(expiry);
  expiry = undefined;
  prepared?.abort.abort();
  if (prepared) { runtimeResources.audioContexts--; void prepared.context.close().catch(() => {}); }
  prepared = undefined;
}
