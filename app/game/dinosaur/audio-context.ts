let prepared: AudioContext | undefined;
let expiry: ReturnType<typeof setTimeout> | undefined;

/** Resume during the Earth tap so Safari can retain activation across the route. */
export function prepareDinosaurAudio() {
  if (typeof AudioContext === "undefined") return;
  try {
    if (!prepared || prepared.state === "closed") prepared = new AudioContext();
    void prepared.resume().catch(() => {});
    if (expiry) clearTimeout(expiry);
    expiry = setTimeout(() => {
      void prepared?.close().catch(() => {});
      prepared = undefined;
      expiry = undefined;
    }, 60_000);
  } catch { /* Navigation remains available if audio activation is unavailable. */ }
}

export function takeDinosaurAudio() {
  if (expiry) clearTimeout(expiry);
  expiry = undefined;
  const context = prepared;
  prepared = undefined;
  return context?.state === "closed" ? undefined : context;
}
