<script setup lang="ts">
import RuRun from "~/components/museum/RuRun.client.vue";
import "~/assets/css/sunny-game.css";
import "~/assets/css/ru-run.css";
useHead({
  title: "みらい博物館",
  htmlAttrs: { lang: "ja" },
  meta: [
    {
      name: "description",
      content:
        "時空ねこのルゥが、恐竜時代の森でおひるねを探すドット絵のランゲーム。",
    },
  ],
});
</script>
<template>
  <ClientOnly
    ><RuRun /><template #fallback
      ><main class="sunny-loading" role="status">
        ルゥを よんでいるよ……
      </main></template
    ></ClientOnly
  >
</template>
