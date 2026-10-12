<script setup lang="ts">
import { readingParts } from "~/games/caesar/readings";
const props = defineProps<{ text: string }>();
const parts = computed(() => readingParts(props.text));
</script>
<template>
  <span class="caesar-readable"><template v-for="(part, index) in parts" :key="index"><ruby v-if="part.reading">{{ part.text }}<rt aria-hidden="true">{{ part.reading }}</rt></ruby><template v-else>{{ part.text }}</template></template></span>
</template>
