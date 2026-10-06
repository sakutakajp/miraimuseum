<script setup lang="ts">
import type { Target } from "~/games/shooter";
withDefaults(defineProps<{ target: Target; elapsed?: number }>(), {
  elapsed: 0,
});
</script>
<template>
  <TresGroup
    :position="[target.x, target.y, target.z]"
    :rotation="
      target.kind === 'enemy'
        ? [0, 0, Math.sin(elapsed * 2) * 0.15]
        : [elapsed * 0.4, elapsed * 0.3, 0]
    "
  >
    <template v-if="target.kind === 'enemy'">
      <TresMesh :scale="[1, 0.55, 1]"
        ><TresOctahedronGeometry :args="[0.48]" /><TresMeshStandardMaterial
          color="#91496a"
          :metalness="0.7"
          :roughness="0.3"
      /></TresMesh>
      <TresMesh :position="[0, 0.06, 0.25]"
        ><TresSphereGeometry :args="[0.16, 10, 8]" /><TresMeshStandardMaterial
          color="#ff608d"
          emissive="#ff2668"
          :emissive-intensity="2"
      /></TresMesh>
      <TresMesh
        v-for="side in [-1, 1]"
        :key="side"
        :position="[side * 0.4, 0, 0]"
        :rotation="[0, 0, side * 0.3]"
        :scale="[0.18, 0.55, 0.7]"
        ><TresOctahedronGeometry :args="[0.65]" /><TresMeshStandardMaterial
          color="#cf83b3"
          emissive="#702849"
          :emissive-intensity="0.25"
          :metalness="0.55"
          :roughness="0.35"
      /></TresMesh>
      <TresMesh :position="[0, -0.09, 0.22]" :scale="[0.38, 0.035, 0.08]"
        ><TresBoxGeometry /><TresMeshBasicMaterial color="#ffc3e2"
      /></TresMesh>
    </template>
    <template v-else-if="target.kind === 'rock'">
      <TresMesh :scale="[1, 0.85, 1.1]"
        ><TresIcosahedronGeometry :args="[0.52, 1]" /><TresMeshStandardMaterial
          color="#807d93"
          :roughness="0.95"
          :flat-shading="true"
      /></TresMesh>
      <TresMesh
        v-for="(p, i) in [
          [0.26, 0.19, 0.31],
          [-0.25, 0.09, 0.34],
          [0.04, -0.3, 0.28],
        ]"
        :key="i"
        :position="[p[0]!, p[1]!, p[2]!]"
        :scale="[1, 0.6, 1]"
        ><TresIcosahedronGeometry :args="[0.14, 0]" /><TresMeshStandardMaterial
          color="#424159"
          :roughness="1"
      /></TresMesh>
    </template>
    <template v-else>
      <TresMesh
        ><TresOctahedronGeometry :args="[0.3]" /><TresMeshStandardMaterial
          color="#ffe6a1"
          emissive="#ffa927"
          :emissive-intensity="1.1"
          :metalness="0.3"
          :roughness="0.25"
      /></TresMesh>
      <TresMesh :rotation="[Math.PI / 2, 0.3, 0]"
        ><TresTorusGeometry
          :args="[0.43, 0.024, 6, 24]" /><TresMeshBasicMaterial color="#ffdd75"
      /></TresMesh>
      <TresMesh
        ><TresSphereGeometry :args="[0.42, 12, 8]" /><TresMeshBasicMaterial
          color="#ffc65b"
          transparent
          :opacity="0.09"
          :depth-write="false"
      /></TresMesh>
    </template>
  </TresGroup>
</template>
