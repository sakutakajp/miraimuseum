<script setup lang="ts">
import ReadableText from "~/components/games/caesar/ReadableText.vue";
import { copy } from "~/games/caesar/copy";
import DinosaurPreview from "~/components/games/DinosaurPreview.vue";
import "~/assets/css/caesar.css";
useHead({ title: `${copy.games} — MIRAI MUSEUM`, meta: [{ name: "description", content: "遊びのなかに、発見を。恐竜の冒険と暗号の遺跡を探索しよう。" }, { name: "theme-color", content: "#102332" }] });
</script>
<template>
  <main class="games-index">
    <header class="caesar-topbar"><NuxtLink to="/" class="caesar-brand">MIRAI <span>MUSEUM</span></NuxtLink><NuxtLink to="/"><ReadableText :text="copy.home" /> ↗</NuxtLink></header>
    <section class="games-index__intro"><span class="caesar-eyebrow">PLAY. WONDER. DISCOVER.</span><h1><ReadableText :text="copy.games" /></h1><p><ReadableText text="遊びのなかに、発見を。" /></p></section>
    <div class="games-index__grid">
      <NuxtLink :aria-label="copy.title" to="/games/caesar" class="games-index__game games-index__game--caesar"><div class="games-index__art" aria-hidden="true"><img class="games-index__illustration" src="/caesar/bridge.webp" alt="" width="1536" height="1024" /><small>THE CIPHER RUINS</small></div><div class="games-index__info"><span class="caesar-eyebrow">04 / ROSETTA STONE</span><h2><ReadableText :text="copy.title" /></h2><p><ReadableText :text="copy.subtitle" /></p><small><ReadableText :text="copy.genre" /> · 2ステージ · <ReadableText :text="copy.noTimer" /></small><strong><ReadableText :text="copy.play" /> <span>→</span></strong></div></NuxtLink>
      <NuxtLink to="/dinosaur" class="games-index__game games-index__game--dinosaur"><div class="games-index__art" aria-hidden="true"><DinosaurPreview /><small>DEEP TIME</small></div><div class="games-index__info"><span class="caesar-eyebrow">01 / DINOSAUR</span><h2><ReadableText text="恐竜ゲーム" /></h2><p><ReadableText text="6600万年前。恐竜時代、最後の日を走る。" /></p><small><ReadableText text="リズムアクション · タップでジャンプ · 76.8秒" /></small><strong><ReadableText text="恐竜時代へ" /> <span>→</span></strong></div></NuxtLink>
    </div><footer class="caesar-page-footer"><span>MIRAI MUSEUM — <ReadableText text="遊びのなかに、発見を。" /></span><NuxtLink to="/"><ReadableText :text="copy.home" /> ↗</NuxtLink></footer>
  </main>
</template>
