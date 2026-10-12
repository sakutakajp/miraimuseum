<script setup lang="ts">
import pixels from "~/museum/pixel-assets.generated.json";
const props = withDefaults(
  defineProps<{
    pose?: "idle" | "happy" | "walk" | "sleep" | "yawn";
    scale?: 2 | 3 | 4;
  }>(),
  { pose: "idle", scale: 2 },
);
const size = computed(() =>
  props.scale === 3 ? 128 : props.scale === 4 ? 192 : 96,
);
const frame = computed(() =>
  props.pose === "sleep" ? "sleep" : props.pose === "walk" ? "walk" : "idle",
);
</script>
<template>
  <span
    class="ru-sprite"
    :class="`ru-sprite--${pose}`"
    :style="{ width: `${size}px`, height: `${size}px` }"
  >
    <img
      :src="pixels.assets[`ru-${frame}-${scale === 3 ? 128 : 96}`].src"
      :width="size"
      :height="size"
      :alt="pose === 'sleep' ? 'まるくなって ねむる ルゥ' : 'くろねこの ルゥ'"
    />
  </span>
</template>
<style scoped>
.ru-sprite {
  display: inline-block;
  flex: none;
  image-rendering: pixelated;
  filter: drop-shadow(0 2px 1px #0005);
}
.ru-sprite img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
}
.ru-sprite--happy img {
  animation: ru-hop 0.45s steps(3, end) 2;
}
.ru-sprite--walk img {
  animation: ru-step 0.28s steps(2, end) infinite;
}
.ru-sprite--sleep img {
  animation: ru-breath 3s ease-in-out infinite;
  transform-origin: 50% 80%;
}
@keyframes ru-hop {
  50% {
    transform: translateY(-6px);
  }
}
@keyframes ru-step {
  50% {
    transform: translateY(-2px);
  }
}
@keyframes ru-breath {
  50% {
    transform: translateY(-1px);
  }
}
@media (prefers-reduced-motion: reduce) {
  .ru-sprite img {
    animation: none !important;
  }
}
</style>
