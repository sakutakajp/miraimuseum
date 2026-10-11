<script setup lang="ts">
import { KANA_ROWS } from "~/games/caesar/cipher";
</script>
<template>
  <div class="adventure-kana-order">
    <p>ひだりから みぎへ すすむよ。</p>
    <ol aria-label="46この もじの ならび"><li v-for="row in KANA_ROWS" :key="row"><span v-for="letter in row" :key="letter">{{ letter }}</span></li></ol>
    <p>『を』も はいるよ。『ん』の つぎは『あ』。</p>
    <p>すきまは かぞえないよ。</p>
  </div>
</template>
