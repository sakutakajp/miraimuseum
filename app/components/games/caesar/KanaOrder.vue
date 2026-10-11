<script setup lang="ts">
import ReadableText from "./ReadableText.vue";
import { KANA_ROWS } from "~/games/caesar/cipher";
import { copy } from "~/games/caesar/copy";
</script>

<template>
  <details class="caesar-kana-order">
    <summary :aria-label="copy.kanaOrder"><ReadableText :text="copy.kanaOrder" /></summary>
    <ol :aria-label="copy.kanaOrder"><li v-for="row in KANA_ROWS" :key="row"><span v-for="letter in row" :key="letter">{{ letter }}</span></li></ol>
  </details>
</template>
