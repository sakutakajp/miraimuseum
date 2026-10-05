<script setup lang="ts">
import { rubySegments } from '~/data/readings';
const props = defineProps<{ text?: string }>();
const { locale, t } = useLanguage();
const displayText = computed(() => t(props.text));
const segments = computed(() => locale.value === 'ja'
  ? rubySegments(displayText.value)
  : [{ text: displayText.value }]);
</script>
<template>
  <span class="ruby-text" :aria-label="displayText">
    <template v-for="(segment, index) in segments" :key="index">
      <ruby v-if="segment.reading">{{ segment.text }}<rt aria-hidden="true">{{ segment.reading }}</rt></ruby>
      <template v-else>{{ segment.text }}</template>
    </template>
  </span>
</template>
