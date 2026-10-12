import { MUSIC_STEMS, type SoundName } from "../config/audio";
import { takeDinosaurAudio } from "../audio-context";
import { loadDinosaurAudioBuffers } from "../audio-assets";
import { runtimeResources } from "../../../three-d/diagnostics";
export class AudioDirector {
  private volume = 0.8;
  private compressor?: DynamicsCompressorNode;
  private ctx?: AudioContext;
  private master?: GainNode;
  private music?: GainNode;
  private sfx?: GainNode;
  private buffers = new Map<string, AudioBuffer>();
  private preparedBuffers?: Promise<Map<string, AudioBuffer>>;
  private sources = new Set<AudioBufferSourceNode>();
  private connections = new Map<AudioBufferSourceNode, GainNode>();
  private musicSources: AudioBufferSourceNode[] = [];
  private anchor = 0;
  private offset = 0;
  private playing = false;
  private disposed = false;
  private abort = new AbortController();
  muted = false;
  syncError = 0;
  get activeSources() {
    return this.sources.size;
  }
  private ensureContext() {
    if (!this.ctx) {
      const audio = takeDinosaurAudio();
      this.ctx = audio?.context ?? new AudioContext();
      if (!audio) runtimeResources.audioContexts++;
      this.preparedBuffers = audio?.buffers;
      if (audio) this.abort = audio.abort;
      this.master = this.ctx.createGain();
      this.music = this.ctx.createGain();
      this.sfx = this.ctx.createGain();
      const compressor = this.ctx.createDynamicsCompressor();
      this.compressor = compressor;
      compressor.threshold.value = -14;
      compressor.ratio.value = 4;
      this.music.gain.value = 0.78;
      this.sfx.gain.value = 0.42;
      this.master.gain.value = this.muted ? 0 : this.volume;
      this.music.connect(compressor);
      this.sfx.connect(compressor);
      compressor.connect(this.master);
      this.master.connect(this.ctx.destination);
    }
  }
  async unlock() {
    this.ensureContext();
    await this.ctx!.resume();
  }
  async load() {
    this.ensureContext();
    const buffers = await (this.preparedBuffers ?? loadDinosaurAudioBuffers(this.ctx!, this.abort.signal));
    if (!this.disposed) this.buffers = buffers;
  }
  private source(name: string, bus: GainNode, volume = 1) {
    if (!this.ctx || !this.buffers.has(name) || this.disposed) return;
    const source = this.ctx.createBufferSource();
    source.buffer = this.buffers.get(name)!;
    const gain = this.ctx.createGain();
    gain.gain.value = volume;
    source.connect(gain);
    gain.connect(bus);
    this.sources.add(source);
    this.connections.set(source, gain);
    source.onended = () => this.release(source);
    return source;
  }
  private release(source: AudioBufferSourceNode) {
    this.sources.delete(source);
    source.disconnect();
    this.connections.get(source)?.disconnect();
    this.connections.delete(source);
    source.onended = null;
  }
  private stop(source: AudioBufferSourceNode) {
    try {
      source.stop();
    } catch {}
    this.release(source);
  }
  start(offset = 0, delay = 0) {
    this.stopMusic();
    if (!this.ctx || !this.music) return;
    this.offset = offset;
    this.anchor = this.ctx.currentTime + delay;
    this.playing = true;
    for (const stem of MUSIC_STEMS) {
      const s = this.source(stem, this.music);
      if (s) {
        s.start(this.anchor, Math.min(offset, s.buffer!.duration - 0.01));
        this.musicSources.push(s);
      }
    }
  }
  stopAll() {
    this.stopMusic();
    for (const s of this.sources) this.stop(s);
  }
  pause() {
    if (this.playing && this.ctx)
      this.offset += Math.max(0, this.ctx.currentTime - this.anchor);
    this.stopMusic();
    for (const s of this.sources) this.stop(s);
  }
  resume(at: number) {
    void this.ctx?.resume();
    this.start(at);
  }
  stopMusic() {
    for (const s of this.musicSources) this.stop(s);
    this.musicSources.length = 0;
    this.playing = false;
  }
  play(name: SoundName, volume = 1) {
    if (this.ctx?.state !== "running" || !this.sfx || this.sources.size >= 20)
      return;
    this.source(name, this.sfx, volume)?.start();
  }
  monitor(at: number) {
    if (!this.ctx || !this.playing) return;
    this.syncError = this.ctx.currentTime - this.anchor + this.offset - at;
    // Repair only exceptional stalls / device interruptions, never seek every frame.
    if (Math.abs(this.syncError) > 0.18) {
      this.start(at);
      this.syncError = 0;
    }
  }
  setMuted(value: boolean) {
    this.muted = value;
    if (this.ctx && this.master)
      this.master.gain.setTargetAtTime(
        value ? 0 : this.volume,
        this.ctx.currentTime,
        0.015,
      );
  }
  setVolume(value: number) { this.volume = Math.max(0, Math.min(1, value)); this.setMuted(this.muted); }
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.abort.abort();
    this.stopMusic();
    for (const s of this.sources) this.stop(s);
    this.sources.clear();
    this.buffers.clear();
    this.master?.disconnect(); this.music?.disconnect(); this.sfx?.disconnect(); this.compressor?.disconnect();
    if (this.ctx) { runtimeResources.audioContexts--; void this.ctx.close().catch(() => {}); this.ctx = undefined; }
  }
}
