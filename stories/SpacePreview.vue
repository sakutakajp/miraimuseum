<script setup lang="ts">
import { TresCanvas } from "@tresjs/core";
import AssetScene from "./AssetScene.vue";
import type { Impact, Target } from "../app/games/shooter";
withDefaults(
  defineProps<{
    mode?: string;
    kind?: Impact["kind"] | Target["kind"];
    age?: number;
    animate?: boolean;
    damaged?: boolean;
    x?: number;
    y?: number;
  }>(),
  {
    mode: "ship",
    kind: "enemy",
    age: 0.16,
    animate: false,
    damaged: false,
    x: 0,
    y: 0,
  },
);
</script>
<template>
  <div
    style="height: 560px; width: 100%; max-width: 560px; background: #080d29"
    data-testid="space-preview"
  >
    <TresCanvas clear-color="#080d29"
      ><AssetScene
        :mode="mode"
        :kind="kind"
        :age="age"
        :animate="animate"
        :damaged="damaged"
        :x="x"
        :y="y"
    /></TresCanvas>
  </div>
</template>
