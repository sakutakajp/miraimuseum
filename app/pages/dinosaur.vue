<script setup lang="ts">
import DeepTimeGame from "~/components/games/deep-time/DeepTimeGame.client.vue";
import { GAME_SAVE_KEY, parseGameProgress, recordGameResult } from "~/games/progress";
import type { ClearResult } from "~/game/dinosaur/types";
import { cybertruckUnlock } from "~/experiences/floating-earth/cybertruck-unlock";
const { locale, initializeLanguage } = useLanguage();
const route = useRoute();
onMounted(initializeLanguage);
useHead(() => ({ title: "MIRAI MUSEUM", meta: [
  { name: "description", content: locale.value === "ja"
    ? "ブラキオサウルスと恐竜時代を駆け抜ける、タップでジャンプするリズムゲーム。"
    : "Run through the age of dinosaurs with a Brachiosaurus. Tap to jump in a cinematic rhythm game." },
  { name: "theme-color", content: "#10110f" },
] }));
function saveClear(value: ClearResult) {
  cybertruckUnlock.cleared();
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
    <DeepTimeGame :auto-start="route.query.play === '1'" @cleared="saveClear" @leave="navigateTo('/')" />
    <template #fallback><div class="deep-time-loading" role="status">Loading...</div></template>
  </ClientOnly>
</template>
