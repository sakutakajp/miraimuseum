import {
  emptyProgress,
  parseProgress,
  recordExpedition,
  SAVE_KEY,
} from "~/game/progress";
import type { DiscoveryId } from "~/data/discoveries";
export function useMuseum() {
  const progress = ref(emptyProgress());
  const storageAvailable = ref(true);
  function save() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(progress.value));
    } catch {
      storageAvailable.value = false;
    }
  }
  onMounted(() => {
    try {
      progress.value = parseProgress(localStorage.getItem(SAVE_KEY));
    } catch {
      storageAvailable.value = false;
    }
  });
  const foundCount = computed(() => Object.keys(progress.value.visits).length);
  function finish(found: DiscoveryId[]) {
    progress.value = recordExpedition(progress.value, found);
    save();
  }
  function toggleSound() {
    progress.value.muted = !progress.value.muted;
    save();
  }
  return { progress, storageAvailable, foundCount, finish, toggleSound };
}
