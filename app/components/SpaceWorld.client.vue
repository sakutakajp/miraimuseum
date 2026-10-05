<script setup lang="ts">
import { useLoop } from "@tresjs/core";
import type { Impact, Shooter } from "~/games/shooter";
const props = defineProps<{ model: Shooter; paused: boolean }>();
const emit = defineEmits<{ tick: [] }>();
const { onBeforeRender } = useLoop();
onBeforeRender(({ delta }) => {
  if (!props.paused) {
    props.model.update(delta);
    emit("tick");
  }
});
const color = (impact: Impact) =>
  ({
    burst: "#ffb64f",
    spark: "#a5efff",
    pickup: "#ffe65a",
    damage: "#ff5081",
  })[impact.kind];
const sparks = Array.from({ length: 10 }, (_, n) => ({
  x: Math.cos((n * Math.PI) / 5),
  y: Math.sin((n * Math.PI) / 5),
  z: Math.sin(n * 2.3) * 0.6,
}));
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
const stars = Array.from({ length: 75 }, (_, i): [number, number, number] => [
  Math.sin(i * 37) * 18,
  Math.cos(i * 19) * 12,
  -4 - (i % 20) * 2,
]);
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
  <TresGroup
    v-for="impact in model.impacts"
    :key="'impact' + impact.id"
    :position="[impact.x, impact.y, impact.z]"
  >
    <TresMesh :scale="0.15 + impact.age * 3">
      <TresSphereGeometry :args="[0.5, 10, 8]" />
      <TresMeshBasicMaterial
        :color="impact.age < 0.08 ? '#ffffff' : color(impact)"
        transparent
        :opacity="Math.max(0, 1 - impact.age / 0.3)"
        :depth-write="false"
      />
    </TresMesh>
    <TresMesh :scale="0.3 + impact.age * 5">
      <TresTorusGeometry :args="[0.5, 0.035, 6, 24]" />
      <TresMeshBasicMaterial
        :color="color(impact)"
        transparent
        :opacity="1 - impact.age / 0.65"
        :depth-write="false"
      />
    </TresMesh>
    <TresMesh
      v-for="(spark, n) in sparks"
      :key="n"
      :position="[
        spark.x * impact.age * 5,
        spark.y * impact.age * 5,
        spark.z * impact.age * 5,
      ]"
      :rotation="[n, impact.age * 8, n]"
      :scale="Math.max(0.01, 0.13 * (1 - impact.age / 0.65))"
    >
      <TresOctahedronGeometry />
      <TresMeshBasicMaterial
        :color="n % 2 ? color(impact) : '#ffffff'"
        transparent
        :opacity="1 - impact.age / 0.65"
      />
    </TresMesh>
  </TresGroup>
  <TresMesh
    v-for="shot in model.shots"
    :key="shot.id"
    :position="[shot.x, shot.y, shot.z]"
    ><TresBoxGeometry :args="[0.08, 0.08, 0.8]" /><TresMeshBasicMaterial
      color="#61ffff"
  /></TresMesh>
</template>
