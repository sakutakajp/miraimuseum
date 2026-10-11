<script setup lang="ts">
import CaesarGame from "~/components/games/caesar/CaesarGame.client.vue";
import "~/assets/css/sunny-game.css";
useHead({
  title: "みらい博物館",
  meta: [
    {
      name: "description",
      content: "ルゥと文字の仕掛けを解いて、ローマの家の日なたへ。",
    },
  ],
  htmlAttrs: { lang: "ja" },
});
</script>
<template>
  <ClientOnly
    ><CaesarGame /><template #fallback
      ><main class="sunny-loading" role="status">
        ルゥを よんでいるよ……
      </main></template
    ></ClientOnly
  >
</template>
