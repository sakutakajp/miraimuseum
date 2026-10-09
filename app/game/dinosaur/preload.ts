import { preloadDinosaurAudio, discardDinosaurAudio } from "./audio-context";
import { preloadDinosaurPlates, discardDinosaurPlates } from "./plate-assets";
let models: typeof import("./player-model") | undefined;

async function importRuntime() {
  const [{ default: Phaser }, { DinosaurRunScene }, { DinosaurUIScene }, playerModel] = await Promise.all([
    import("phaser"), import("./scenes/DinosaurRunScene"), import("./scenes/DinosaurUIScene"), import("./player-model"),
  ]);
  models = playerModel;
  return { Phaser, DinosaurRunScene, DinosaurUIScene, playerModel };
}

let runtime: ReturnType<typeof importRuntime> | undefined;
let preparation: { abort: AbortController; ready: Promise<boolean> } | undefined;

function loadRuntime() {
  runtime ??= importRuntime().catch(error => { runtime = undefined; throw error; });
  return runtime;
}

/** Warm modules, decoded art and sound without creating another WebGL renderer. */
export function preloadDinosaurGame() {
  if (!preparation) {
    discardDinosaurPlates();
    discardDinosaurAudio();
    models?.discardPlayerModel();
    const abort = new AbortController();
    preparation = {
      abort,
      ready: Promise.all([
        loadRuntime().then(runtime => runtime.playerModel.preloadPlayerModel(abort.signal)),
        preloadDinosaurPlates(abort.signal), preloadDinosaurAudio(abort.signal),
      ]).then(() => true, () => false),
    };
  }
  return preparation.ready;
}

export async function takeDinosaurRuntime(signal: AbortSignal) {
  signal.throwIfAborted();
  const pending = preparation;
  preparation = undefined;
  if (pending) {
    // Remaining background requests stay owned by the game's lifetime.
    signal.addEventListener("abort", () => pending.abort.abort(), { once: true });
    await pending.ready;
  }
  signal.throwIfAborted();
  return loadRuntime();
}

export function discardDinosaurPreload() {
  preparation?.abort.abort();
  preparation = undefined;
  discardDinosaurPlates();
  discardDinosaurAudio();
  models?.discardPlayerModel();
}
