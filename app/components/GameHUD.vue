<script setup lang="ts">
defineProps<{ health: number; score: number; distance: number }>();
defineEmits<{ pause: [] }>();
const { t } = useLanguage();
</script>
<template>
  <div class="mvp-hud">
    <strong>{{ "♥".repeat(health) }}{{ "♡".repeat(3 - health) }}</strong
    ><span>SCORE {{ score.toLocaleString() }}</span
    ><button :aria-label="t('一時停止')" @click="$emit('pause')">II</button
    ><progress :value="distance" max="1" />
  </div>
</template>
