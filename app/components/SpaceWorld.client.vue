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
const stars = Array.from({ length: 75 }, (_, i): [number, number, number] => [
  Math.sin(i * 37) * 18,
  Math.cos(i * 19) * 12,
  -4 - (i % 20) * 2,
]);
</script>
<template>
  <TresPerspectiveCamera
    :position="[0, 3, 14]"
    :look-at="[0, 0, -12]"
    :fov="60"
  />
  <TresAmbientLight :intensity="2" /><TresDirectionalLight
    :position="[3, 5, 5]"
    :intensity="4"
  />
  <TresMesh v-for="(p, i) in stars" :key="'s' + i" :position="p"
    ><TresSphereGeometry :args="[0.035, 5, 5]" /><TresMeshBasicMaterial
      color="#bbdbff"
  /></TresMesh>
  <TresGroup
    :position="[model.x, model.y, 0]"
    :rotation="[0, 0, -model.x * 0.12]"
  >
    <TresMesh :rotation="[-Math.PI / 2, 0, 0]"
      ><TresConeGeometry :args="[0.38, 1.4, 6]" /><TresMeshStandardMaterial
        :color="model.invulnerable > 0 ? '#ff9e9e' : '#fff6dc'"
    /></TresMesh>
    <TresMesh :scale="[1.4, 0.12, 0.55]" :position="[0, 0, 0.25]"
      ><TresBoxGeometry /><TresMeshStandardMaterial color="#ffb347"
    /></TresMesh>
    <TresMesh :position="[0, 0.2, 0.05]"
      ><TresSphereGeometry :args="[0.22, 12, 8]" /><TresMeshStandardMaterial
        color="#43e1ff"
    /></TresMesh>
    <TresMesh :position="[0, 0, 0.8]"
      ><TresSphereGeometry :args="[0.16, 8, 8]" /><TresMeshBasicMaterial
        color="#59f5ff"
    /></TresMesh>
  </TresGroup>
  <TresMesh
    v-for="target in model.targets"
    :key="target.id"
    :position="[target.x, target.y, target.z]"
    :rotation="[model.elapsed, model.elapsed * 0.7, 0]"
  >
    <TresIcosahedronGeometry :args="[target.kind === 'item' ? 0.3 : 0.55, 0]" />
    <TresMeshStandardMaterial
      :color="
        target.kind === 'enemy'
          ? '#ff4e8c'
          : target.kind === 'item'
            ? '#ffe66d'
            : '#8b93b0'
      "
      :metalness="0.4"
      :roughness="0.4"
    />
  </TresMesh>
  <TresMesh
    v-for="shot in model.shots"
    :key="shot.id"
    :position="[shot.x, shot.y, shot.z]"
    ><TresBoxGeometry :args="[0.08, 0.08, 0.8]" /><TresMeshBasicMaterial
      color="#61ffff"
  /></TresMesh>
</template>
