import { assetBytes } from "./fetch";
// Decoded PCM is independent of an AudioContext. Keep a bounded cache across
// fast retries/routes; playback nodes and contexts always belong to the caller.
const buffers = new Map<string, AudioBuffer>();
const cost = (buffer: AudioBuffer) => (buffer.length ?? Math.ceil(buffer.duration * (buffer.sampleRate || 24000))) * (buffer.numberOfChannels || 2) * 4;
export const audioCacheBytes = () => [...buffers.values()].reduce((sum, buffer) => sum + cost(buffer), 0);
export function clearAudioCache() { buffers.clear(); }
export async function decodedAudio(url: string, context: AudioContext, signal: AbortSignal) {
  signal.throwIfAborted();
  const cached = buffers.get(url);
  if (cached) { buffers.delete(url); buffers.set(url, cached); return cached; }
  let bytes: ArrayBuffer;
  try { bytes = await assetBytes(url, signal, "low"); } catch (error) { signal.throwIfAborted(); throw new Error(`Audio asset: ${url}`, { cause: error }); }
  const buffer = await context.decodeAudioData(bytes); signal.throwIfAborted();
  if (cost(buffer) <= 48 * 1024 * 1024) {
    buffers.set(url, buffer);
    while (audioCacheBytes() > 48 * 1024 * 1024) buffers.delete(buffers.keys().next().value!);
  }
  return buffer;
}
