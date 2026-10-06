<script setup lang="ts">
import { TresCanvas } from "@tresjs/core";
import { unref } from "vue";
import { StarDiveRuntime } from "../app/games/star-dive/StarDiveRuntime";
import { createWebGL2Renderer } from "../app/games/star-dive/visual/renderer";
import type { Quality } from "../app/games/star-dive/performance/PerformanceManager";
import type { TargetKind } from "../app/games/star-dive/config";
import StarDiveWorld from "../app/components/games/star-dive/StarDiveWorld.client.vue";
const props = withDefaults(
  defineProps<{
    time?: number;
    quality?: Quality;
    object?: TargetKind;
    reduced?: boolean;
  }>(),
  { time: 18, quality: "medium", reduced: false },
);
const runtime = markRaw(new StarDiveRuntime());
watch(
  () => [props.time, props.object] as const,
  () => {
    runtime.seek(props.time);
    runtime.gateOpen = props.time >= 57.3;
    if (props.object || (props.time >= 13.3 && props.time < 26.7))
      runtime.entities.push({
        id: 900,
        kind: props.object ?? "shard",
        x: 0.8,
        y: 0.7,
        z: -4,
        born: props.time,
        hp: 3,
        radius: 0.5,
        nearRadius: 1.2,
        minDistance: Infinity,
        touched: false,
        passed: false,
      });
    if (props.time >= 27 && props.time < 53)
      for (let i = 0; i < 3; i++)
        runtime.entities.push({
          id: 910 + i,
          kind: "asteroid",
          x: i === 1 ? -1.7 : 2.7,
          y: 0.5 - i * 0.6,
          z: -8 - i * 7,
          born: props.time,
          hp: 1,
          radius: 0.6 + i * 0.2,
          nearRadius: 1.5,
          minDistance: Infinity,
          touched: false,
          passed: false,
        });
    runtime.score.risk = props.time >= 40 ? 2.5 : 1;
  },
  { immediate: true },
);
onBeforeUnmount(() => runtime.dispose());
</script>
<template>
  <div
    class="star-dive"
    style="height: 650px; max-height: 90vh"
    data-testid="star-dive-preview"
  >
    <TresCanvas
      :renderer="(context) => createWebGL2Renderer(unref(context.canvas))"
      ><StarDiveWorld
        :runtime="runtime"
        preview
        :quality="quality"
        :reduced="reduced"
    /></TresCanvas>
  </div>
</template>
