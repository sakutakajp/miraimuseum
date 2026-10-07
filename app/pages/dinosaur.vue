<script setup lang="ts">
import DeepTimeGame from "~/components/games/deep-time/DeepTimeGame.client.vue";
import { GAME_SAVE_KEY, parseGameProgress, recordGameResult } from "~/games/progress";
import type { ClearResult } from "~/game/dinosaur/types";
const { initializeLanguage } = useLanguage();
onMounted(initializeLanguage);
useHead({ title: "MIRAI: DEEP TIME", meta: [{ name: "theme-color", content: "#10110f" }] });
function saveClear(value: ClearResult) {
  try {
    const progress = parseGameProgress(localStorage.getItem(GAME_SAVE_KEY));
    localStorage.setItem(GAME_SAVE_KEY, JSON.stringify(recordGameResult(progress, {
      game: "dinosaur-run", stage: 1, cleared: true, score: value.score, health: 1, elapsed: 76.8,
    })));
  } catch { /* The game also keeps its independent record and reports unavailable storage. */ }
}
</script>
<template>
  <ClientOnly>
    <DeepTimeGame @cleared="saveClear" @leave="navigateTo('/')" />
    <template #fallback><div class="deep-time-loading" role="status">Loading...</div></template>
  </ClientOnly>
</template>
