<script setup lang="ts">
import { computed, ref } from "vue";
import { useLoop } from "@tresjs/core";
import SpaceShip from "../app/components/space/SpaceShip.vue";
import SpaceTarget from "../app/components/space/SpaceTarget.vue";
import SpaceImpact from "../app/components/space/SpaceImpact.vue";
import SpaceBackdrop from "../app/components/space/SpaceBackdrop.vue";
import type { Target, Impact } from "../app/games/shooter";
const props = defineProps<{
  mode: string;
  kind: Target["kind"] | Impact["kind"];
  age: number;
  animate: boolean;
  damaged: boolean;
  x: number;
  y: number;
}>();
const time = ref(0);
const { onBeforeRender } = useLoop();
onBeforeRender(({ delta }) => {
  if (props.animate) time.value += delta;
});
const impact = computed(() => ({
  id: 1,
  x: 0,
  y: 0,
  z: 0,
  kind: props.kind as Impact["kind"],
  age: props.animate ? time.value % 0.65 : props.age,
  points: 120,
  combo: 1,
}));
</script>
<template>
  <TresPerspectiveCamera
    :position="
      mode === 'background'
        ? [0, 3, 14]
        : mode === 'impact'
          ? [0, 2, 7]
          : [2.7, 2.5, 5.5]
    "
    :look-at="mode === 'background' ? [0, 0, -12] : [0, 0, 0]"
  />
  <SpaceBackdrop />
  <SpaceShip v-if="mode === 'ship'" :x="x" :y="y" :damaged="damaged" />
  <SpaceTarget
    v-if="mode === 'object'"
    :target="{ id: 1, x: 0, y: 0, z: 0, kind: kind as Target['kind'] }"
    :elapsed="animate ? time : 0"
  />
  <SpaceImpact v-if="mode === 'impact'" :impact="impact" />
</template>
