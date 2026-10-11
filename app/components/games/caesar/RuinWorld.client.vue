<script setup lang="ts">
import ReadableText from "~/components/games/caesar/ReadableText.vue";
import { copy } from "~/games/caesar/copy";
import type { RuinWorld, WorldState } from "~/games/caesar/scene";
const props = defineProps<{ state: WorldState; light: boolean }>();
const canvas = ref<HTMLCanvasElement>();
const renderer = ref<"loading" | "webgl" | "fallback">("loading");
const canvasKey = ref(0);
let world: RuinWorld | undefined;
let disposed = false;
let loading = false;
async function initialize() {
  if (!canvas.value || loading || disposed) return;
  loading = true;
  renderer.value = "loading";
  try {
    const { createRuinWorld } = await import("~/games/caesar/scene");
    if (disposed || !canvas.value) return;
    world?.dispose();
    world = createRuinWorld(canvas.value, matchMedia("(prefers-reduced-motion: reduce)").matches, props.light, contextLost);
    world.update(props.state);
    renderer.value = "webgl";
  } catch {
    world?.dispose();
    world = undefined;
    renderer.value = "fallback";
  } finally { loading = false; }
}
function contextLost() {
  world?.dispose();
  world = undefined;
  renderer.value = "fallback";
}
async function retry() {
  canvasKey.value++;
  await nextTick();
  await initialize();
}
watch(() => props.state, value => world?.update(value), { deep: true });
watch(() => props.light, value => world?.quality(value));
onMounted(initialize);
onBeforeUnmount(() => { disposed = true; world?.dispose(); });
</script>
<template>
  <div class="caesar-world" :data-renderer="renderer">
    <img :src="state.stage === 1 ? '/caesar/bridge.webp' : '/caesar/transmitter.webp'" class="caesar-world__illustration" :class="{ 'is-machine': state.stage === 2 }" alt="" width="1536" height="1024" fetchpriority="high" decoding="async" />
    <canvas :key="canvasKey" ref="canvas" aria-hidden="true" />
    <div class="caesar-world__shade" />
    <div v-if="renderer === 'loading'" class="caesar-world__notice" role="status"><ReadableText :text="copy.loading" /></div>
    <div v-else-if="renderer === 'fallback'" class="caesar-world__notice caesar-world__notice--fallback"><p><ReadableText :text="copy.visualFallback" /></p><button :aria-label="copy.retry3d" class="caesar-link-button" @click="retry"><ReadableText :text="copy.retry3d" /></button></div>
    <slot />
  </div>
</template>
