<script setup lang="ts">
import DeepTimeArtwork from "./games/deep-time/DeepTimeArtwork.vue";
import type { GameId } from "~/games/catalog";
defineProps<{ game: GameId }>();
</script>
<template><div class="game-artwork" :class="game" aria-hidden="true"><DeepTimeArtwork preserveAspectRatio="xMidYMid slice" /><div class="artwork-grid" /></div></template>
