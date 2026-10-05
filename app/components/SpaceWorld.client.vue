<script setup lang="ts">
import { useLoop } from "@tresjs/core";
import type { Shooter } from "~/games/shooter";
const props = defineProps<{ model: Shooter; paused: boolean }>();
const emit = defineEmits<{ tick: [] }>();
const { onBeforeRender } = useLoop();
onBeforeRender(({ delta }) => {
  if (!props.paused) {
    props.model.update(delta);
    emit("tick");
  }
});
const reducedMotion = ref(false);
onMounted(() => {
  reducedMotion.value = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;
});
const kick = computed(() =>
  reducedMotion.value
    ? 0
    : props.model.impacts.reduce(
        (max, i) =>
          Math.max(
            max,
            i.kind === "damage"
              ? Math.max(0, 0.24 - i.age)
              : i.kind === "burst"
                ? Math.max(0, 0.09 - i.age)
                : 0,
          ),
        0,
      ),
);
</script>
<template>
  <TresPerspectiveCamera
    :position="[
      Math.sin(model.elapsed * 85) * kick,
      3 + Math.cos(model.elapsed * 73) * kick,
      14,
    ]"
    :look-at="[0, 0, -12]"
    :fov="60"
  />
  <SpaceBackdrop />
  <SpaceShip :x="model.x" :y="model.y" :damaged="model.invulnerable > 0" />
  <SpaceTarget
    v-for="target in model.targets"
    :key="target.id"
    :target="target"
    :elapsed="model.elapsed"
  />
  <SpaceImpact
    v-for="impact in model.impacts"
    :key="impact.id"
    :impact="impact"
  />
  <TresMesh
    v-for="shot in model.shots"
    :key="shot.id"
    :position="[shot.x, shot.y, shot.z]"
    ><TresBoxGeometry :args="[0.08, 0.08, 0.8]" /><TresMeshBasicMaterial
      color="#61ffff"
  /></TresMesh>
</template>
