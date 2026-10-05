<script setup lang="ts">
const stars = Array.from({ length: 75 }, (_, i): [number, number, number] => [
  Math.sin(i * 37) * 18,
  Math.cos(i * 19) * 12,
  -4 - (i % 20) * 2,
]);
</script>
<template>
  <TresAmbientLight :intensity="2" /><TresDirectionalLight
    :position="[3, 5, 5]"
    :intensity="4"
  />
  <TresMesh v-for="(p, i) in stars" :key="'s' + i" :position="p"
    ><TresSphereGeometry :args="[0.035, 5, 5]" /><TresMeshBasicMaterial
      color="#bbdbff"
  /></TresMesh>
</template>
