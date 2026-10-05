<script setup lang="ts">
import type { Impact } from "~/games/shooter";
defineProps<{ impact: Impact }>();
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
</script>
<template>
  <TresGroup :position="[impact.x, impact.y, impact.z]">
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
</template>
