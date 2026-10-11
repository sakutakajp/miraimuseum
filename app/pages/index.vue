<script setup lang="ts">
import PixelArt from "~/components/museum/PixelArt.vue";
import RuSprite from "~/components/museum/RuSprite.vue";
import MusicToggle from "~/components/museum/MusicToggle.vue";
import MuseumMenu from "~/components/museum/MuseumMenu.vue";
import ReadableText from "~/components/games/caesar/ReadableText.vue";
useHead({
  title: "みらい博物館",
  htmlAttrs: { lang: "ja" },
  link: [
    {
      rel: "preload",
      as: "image",
      href: "/museum/pixel/standard/exterior-phone.png",
      media: "(max-width: 699px)",
    },
  ],
});
</script>
<template>
  <main class="museum-exterior" lang="ja" data-testid="museum-exterior">
    <header class="museum-exterior-header">
      <h1><ReadableText text="みらい博物館" /></h1>
      <div class="museum-header-actions"><MusicToggle /><MuseumMenu /></div>
    </header>
    <PixelArt
      class="museum-exterior-art"
      asset="exterior-phone"
      wide-asset="exterior-wide"
      landscape-asset="exterior-landscape"
      alt="星空の下、あたたかな窓とガラスのドームが光る石造りの博物館"
      priority
    >
      <div class="museum-entrance">
        <RuSprite pose="idle" :scale="3" /><NuxtLink
          class="museum-button museum-enter"
          to="/games/caesar"
          >はいる <span aria-hidden="true">⌑</span></NuxtLink
        >
      </div>
    </PixelArt>
  </main>
</template>
