/** Original eight-bar lullaby. MIDI notes, four beats per bar, 72 BPM. */
export const MUSIC_BARS = [
  [72, 76, 79, 76],
  [74, 77, 81, 77],
  [76, 79, 83, 79],
  [74, 77, 79, 77],
  [72, 76, 79, 84],
  [81, 79, 77, 76],
  [74, 77, 79, 74],
  [72, 76, 74, 72],
] as const;
export const BEAT = 60 / 72;
export const MUSIC_BASS = [48, 50, 52, 55, 48, 53, 55, 48];
export const noteFrequency = (note: number) => 440 * 2 ** ((note - 69) / 12);

/** Also usable with OfflineAudioContext to verify the actual sound graph. */
export function scheduleMusicBar(
  ctx: BaseAudioContext,
  output: AudioNode,
  bar: number,
  start: number,
) {
  const index =
    ((bar % MUSIC_BARS.length) + MUSIC_BARS.length) % MUSIC_BARS.length;
  const voices: OscillatorNode[] = [];
  function note(
    midi: number,
    time: number,
    duration: number,
    volume: number,
    type: OscillatorType,
  ) {
    const oscillator = ctx.createOscillator(),
      envelope = ctx.createGain();
    oscillator.type = type;
    oscillator.frequency.value = noteFrequency(midi);
    envelope.gain.setValueAtTime(0, time);
    envelope.gain.linearRampToValueAtTime(volume, time + 0.025);
    envelope.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    oscillator.connect(envelope);
    envelope.connect(output);
    oscillator.onended = () => {
      oscillator.disconnect();
      envelope.disconnect();
    };
    oscillator.start(time);
    oscillator.stop(time + duration + 0.02);
    voices.push(oscillator);
  }
  MUSIC_BARS[index]!.forEach((midi, beat) => {
    note(midi, start + beat * BEAT, BEAT * 1.4, 0.12, "sine");
    note(midi + 12, start + beat * BEAT, BEAT * 0.6, 0.018, "sine");
  });
  note(MUSIC_BASS[index]!, start, BEAT * 3.8, 0.065, "triangle");
  return voices;
}

/** No AudioContext exists before a user explicitly switches music on. */
export function createMuseumMusic(makeContext: () => AudioContext) {
  let context: AudioContext | undefined, output: GainNode | undefined;
  let timer: ReturnType<typeof setInterval> | undefined;
  let voices: OscillatorNode[] = [],
    nextBar = 0,
    bar = 0,
    wanted = false,
    hidden = false,
    disposed = false;
  function stopNotes() {
    clearInterval(timer);
    timer = undefined;
    for (const voice of voices) {
      try {
        voice.stop();
      } catch {}
    }
    voices = [];
  }
  function schedule() {
    if (!context || !output || !wanted || hidden || disposed) return;
    if (context.currentTime + 0.25 >= nextBar) {
      const created = scheduleMusicBar(context, output, bar++, nextBar);
      for (const voice of created) {
        const cleanup = voice.onended;
        voice.onended = (event) => {
          cleanup?.call(voice, event);
          voices = voices.filter((v) => v !== voice);
        };
      }
      voices.push(...created);
      nextBar += BEAT * 4;
    }
  }
  async function start() {
    if (disposed || !wanted || hidden) return;
    context ??= makeContext();
    if (!output) {
      output = context.createGain();
      output.gain.value = 0.45;
      output.connect(context.destination);
    }
    await context.resume();
    if (!wanted || hidden || disposed) return;
    stopNotes();
    nextBar = context.currentTime + 0.04;
    schedule();
    timer = setInterval(schedule, 100);
  }
  return {
    async setEnabled(enabled: boolean) {
      wanted = enabled;
      if (enabled) {
        try {
          await start();
        } catch {
          wanted = false;
          stopNotes();
          await context?.suspend().catch(() => {});
          throw new Error("Music unavailable");
        }
      } else {
        stopNotes();
        await context?.suspend().catch(() => {});
      }
    },
    async setHidden(value: boolean) {
      hidden = value;
      if (value) {
        stopNotes();
        await context?.suspend().catch(() => {});
      } else if (wanted) {
        try {
          await start();
        } catch {
          wanted = false;
        }
      }
    },
    dispose() {
      disposed = true;
      wanted = false;
      stopNotes();
      output?.disconnect();
      void context?.close().catch(() => {});
    },
  };
}
