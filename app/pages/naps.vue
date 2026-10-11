<script setup lang="ts">
import PixelArt from "~/components/museum/PixelArt.vue";
import { exhibits } from "~/museum/exhibits";
import { emptyCollection, readCollection } from "~/museum/collection";
import MusicToggle from "~/components/museum/MusicToggle.vue";
import MuseumMenu from "~/components/museum/MuseumMenu.vue";
import RuSprite from "~/components/museum/RuSprite.vue";
import ReadableText from "~/components/games/caesar/ReadableText.vue";
const collection = ref(emptyCollection());
onMounted(() => {
  try {
    collection.value = readCollection(localStorage);
  } catch {}
});
const entries = computed(() =>
  collection.value.naps.map((n) => ({
    ...n,
    exhibit: exhibits.find((e) => e.id === n.id)!,
  })),
);
useHead({ title: "みらい博物館", htmlAttrs: { lang: "ja" } });
</script>
<template>
  <main class="museum-library" lang="ja">
    <header class="museum-header">
      <NuxtLink to="/" class="museum-wordmark"
        ><ReadableText text="みらい博物館"
      /></NuxtLink>
      <div class="museum-header-actions"><MusicToggle /><MuseumMenu /></div>
    </header>
    <div class="museum-page-intro">
      <span class="museum-small-label">ルゥの ねどこ</span>
      <h1>おひるねずかん</h1>
      <p>{{ entries.length }} / 2 みつけた</p>
    </div>
    <div class="nap-list">
      <article v-for="entry in entries" :key="entry.id" class="nap-entry">
        <div class="nap-spot">
          <PixelArt
            :asset="entry.id === 'sunny-room' ? 'nap-phone' : 'forest-phone'"
            :anchor-y="0.7"
            alt="ルゥが みつけた おひるねの ばしょ"
          /><RuSprite pose="sleep" :scale="3" />
        </div>
        <h2>{{ entry.exhibit.nap }}</h2>
        <p>おひるね {{ entry.visits }} かい</p>
        <NuxtLink class="museum-button" :to="entry.exhibit.route"
          >もういちど あそぶ</NuxtLink
        >
      </article>
      <div v-if="!entries.length" class="nap-empty">
        <RuSprite pose="idle" :scale="3" />
        <p>ねどこを みつけに いこう。</p>
      </div>
    </div>
    <div class="museum-page-intro">
      <NuxtLink class="museum-button" to="/">はくぶつかんへ</NuxtLink>
      <p>この ブラウザだけの きろくだよ。</p>
    </div>
  </main>
</template>
