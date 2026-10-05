<script setup lang="ts">
import { palette, sprites, spriteSize } from "~/data/sprites";
const props = defineProps<{ name: string; label?: string }>();
const size = computed(() => spriteSize(props.name));
const pixels = computed(() =>
  (sprites[props.name] ?? sprites.robot!).flatMap((row, y) =>
    [...row].flatMap((key, x) =>
      key === "." ? [] : [{ x, y, color: palette[key] }],
    ),
  ),
);
</script>
<template>
  <svg
    :viewBox="`0 0 ${size.width} ${size.height}`"
    shape-rendering="crispEdges"
    :role="label ? 'img' : undefined"
    :aria-label="label"
    :aria-hidden="!label"
  >
    <rect
      v-for="(pixel, i) in pixels"
      :key="i"
      :x="pixel.x"
      :y="pixel.y"
      width="1"
      height="1"
      :fill="pixel.color"
    />
  </svg>
</template>
