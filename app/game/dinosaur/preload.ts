import { preloadDinosaurAudio, discardDinosaurAudio } from "./audio-context";
import { preloadDinosaurPlates, discardDinosaurPlates } from "./plate-assets";

async function importRuntime() {
  const [{ default: Phaser }, { DinosaurRunScene }, { DinosaurUIScene }] = await Promise.all([
    import("phaser"), import("./scenes/DinosaurRunScene"), import("./scenes/DinosaurUIScene"),
  ]);
  return { Phaser, DinosaurRunScene, DinosaurUIScene };
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
    const abort = new AbortController();
    preparation = {
      abort,
      ready: Promise.all([
        loadRuntime(), preloadDinosaurPlates(abort.signal), preloadDinosaurAudio(abort.signal),
      ]).then(() => true, () => false),
    };
  }
  return preparation.ready;
}

export async function takeDinosaurRuntime(signal: AbortSignal) {
  const pending = preparation;
  preparation = undefined;
  const cancel = () => pending?.abort.abort();
  signal.addEventListener("abort", cancel, { once: true });
  try { if (pending) await pending.ready; }
  finally { signal.removeEventListener("abort", cancel); }
  return loadRuntime();
}

export function discardDinosaurPreload() {
  preparation?.abort.abort();
  preparation = undefined;
  discardDinosaurPlates();
  discardDinosaurAudio();
}
