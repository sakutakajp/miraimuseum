<script setup lang="ts">
withDefaults(defineProps<{ x?: number; y?: number; damaged?: boolean }>(), {
  x: 0,
  y: 0,
  damaged: false,
});
</script>
<template>
  <TresGroup :position="[x, y, 0]" :rotation="[0, 0, -x * 0.12]">
    <TresMesh :rotation="[-Math.PI / 2, 0, 0]"
      ><TresConeGeometry :args="[0.38, 1.4, 6]" /><TresMeshStandardMaterial
        :color="damaged ? '#ff9e9e' : '#fff6dc'"
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
</template>
