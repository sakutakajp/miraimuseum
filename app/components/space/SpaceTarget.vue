<script setup lang="ts">
import type { Target } from "~/games/shooter";
withDefaults(defineProps<{ target: Target; elapsed?: number }>(), {
  elapsed: 0,
});
</script>
<template>
  <TresMesh
    :position="[target.x, target.y, target.z]"
    :rotation="[elapsed, elapsed * 0.7, 0]"
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
</template>
