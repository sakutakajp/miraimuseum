<script setup lang="ts">
withDefaults(defineProps<{ x?: number; y?: number; damaged?: boolean }>(), {
  x: 0,
  y: 0,
  damaged: false,
});
</script>
<template>
  <TresGroup :position="[x, y, 0]" :rotation="[0, -x * 0.035, -x * 0.12]">
    <TresMesh :rotation="[-Math.PI / 2, 0, 0]" :scale="[1, 0.55, 1]"
      ><TresConeGeometry :args="[0.38, 1.65, 6]" /><TresMeshStandardMaterial
        :color="damaged ? '#ff6483' : '#e9f1ee'"
        :metalness="0.55"
        :roughness="0.3"
    /></TresMesh>
    <TresMesh :position="[0, 0.13, -0.6]" :rotation="[-Math.PI / 2, 0, 0]"
      ><TresConeGeometry :args="[0.12, 0.45, 4]" /><TresMeshStandardMaterial
        color="#ffb653"
        :metalness="0.4"
        :roughness="0.35"
    /></TresMesh>
    <TresGroup
      v-for="side in [-1, 1]"
      :key="side"
      :position="[side * 0.44, 0, 0.2]"
      :rotation="[0, side * 0.35, 0]"
    >
      <TresMesh :scale="[0.68, 0.08, 0.66]" :rotation="[0, 0, side * 0.06]"
        ><TresBoxGeometry /><TresMeshStandardMaterial
          :color="damaged ? '#ff6483' : '#ffb450'"
          :metalness="0.5"
          :roughness="0.3"
      /></TresMesh>
      <TresMesh :position="[0, 0.046, 0]" :scale="[0.38, 0.025, 0.44]"
        ><TresBoxGeometry /><TresMeshStandardMaterial
          color="#f5f5e8"
          :metalness="0.45"
          :roughness="0.3"
      /></TresMesh>
      <TresMesh
        :position="[side * 0.23, 0.03, 0.15]"
        :scale="[0.09, 0.06, 0.38]"
        ><TresBoxGeometry /><TresMeshStandardMaterial color="#264463"
      /></TresMesh>
      <TresMesh :position="[side * 0.28, 0.08, -0.17]"
        ><TresSphereGeometry :args="[0.035, 6, 6]" /><TresMeshBasicMaterial
          color="#78ffff"
      /></TresMesh>
    </TresGroup>
    <TresMesh :position="[0, 0.17, -0.12]" :scale="[0.65, 0.5, 1]"
      ><TresSphereGeometry :args="[0.3, 16, 12]" /><TresMeshStandardMaterial
        color="#123d68"
        emissive="#1fabc6"
        :emissive-intensity="0.5"
        :metalness="0.6"
        :roughness="0.15"
    /></TresMesh>
    <TresMesh :position="[-0.07, 0.285, -0.18]" :scale="[0.045, 0.02, 0.21]"
      ><TresBoxGeometry /><TresMeshBasicMaterial color="#b7fcff"
    /></TresMesh>
    <TresGroup
      v-for="side in [-1, 1]"
      :key="'engine' + side"
      :position="[side * 0.22, 0, 0.53]"
    >
      <TresMesh :rotation="[Math.PI / 2, 0, 0]"
        ><TresCylinderGeometry
          :args="[0.11, 0.13, 0.34, 10]" /><TresMeshStandardMaterial
          color="#29455e"
          :metalness="0.7"
          :roughness="0.25"
      /></TresMesh>
      <TresMesh :position="[0, 0, 0.19]" :rotation="[Math.PI / 2, 0, 0]"
        ><TresTorusGeometry
          :args="[0.09, 0.022, 6, 12]" /><TresMeshBasicMaterial color="#91ffff"
      /></TresMesh>
      <TresMesh :position="[0, 0, 0.39]" :rotation="[Math.PI / 2, 0, 0]"
        ><TresConeGeometry :args="[0.095, 0.4, 8]" /><TresMeshBasicMaterial
          color="#68e9ff"
          transparent
          :opacity="0.7"
      /></TresMesh>
    </TresGroup>
  </TresGroup>
</template>
