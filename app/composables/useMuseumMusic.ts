import { createMuseumMusic } from "~/museum/music";
let player: ReturnType<typeof createMuseumMusic> | undefined;
export function useMuseumMusic() {
  const enabled = useState("museum-music", () => false);
  const unavailable = useState("museum-music-unavailable", () => false);
  async function toggle() {
    if (import.meta.server) return;
    player ??= createMuseumMusic(() => new AudioContext());
    const next = !enabled.value;
    enabled.value = next;
    try {
      await player.setEnabled(next);
      unavailable.value = false;
    } catch {
      enabled.value = false;
      unavailable.value = true;
    }
  }
  function hidden() {
    void player?.setHidden(document.hidden);
  }
  function dispose() {
    player?.dispose();
    player = undefined;
    enabled.value = false;
  }
  return { enabled, unavailable, toggle, hidden, dispose };
}
