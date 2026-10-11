<script setup lang="ts">
import type { RuinWorld, WorldState } from "~/games/caesar/scene";
import CharacterPortrait from "./CharacterPortrait.vue";
const props = defineProps<{ state: WorldState; light: boolean }>();
const emit = defineEmits<{ status: [status: string, reason: string] }>();
const canvas = ref<HTMLCanvasElement>();
const renderer = ref<"loading" | "webgl" | "fallback">("loading");
const canvasKey = ref(0);
let world: RuinWorld | undefined;
let disposed = false, loading = false;
function report(status: typeof renderer.value, reason = "") { renderer.value = status; emit("status", status, reason); }
async function initialize() {
  if (!canvas.value || loading || disposed) return;
  loading = true; report("loading");
  try {
    const { createRuinWorld } = await import("~/games/caesar/scene");
    if (disposed || !canvas.value) return;
    world?.dispose();
    world = createRuinWorld(canvas.value, matchMedia("(prefers-reduced-motion: reduce)").matches, props.light, contextLost);
    world.update(props.state); report("webgl");
  } catch (error) {
    world?.dispose(); world = undefined;
    report("fallback", error instanceof Error && error.message.includes("WebGL2") ? "この環境ではWebGL2を利用できません。" : error instanceof Error && /webgl/i.test(error.message) ? "この環境ではWebGLの描画を開始できません。" : "描画の初期化を完了できませんでした。");
  } finally { loading = false; }
}
function contextLost() {
  world?.dispose(); world = undefined;
  report("fallback", "描画コンテキストが失われました。端末やブラウザの状態によって起こることがあります。");
}
async function retry() {
  if (loading || disposed) return;
  world?.dispose(); world = undefined;
  canvasKey.value++;
  await nextTick(); await initialize();
}
defineExpose({ retry });
watch(() => props.state, value => world?.update(value), { deep: true });
watch(() => props.light, value => world?.quality(value));
onMounted(initialize);
onBeforeUnmount(() => { disposed = true; world?.dispose(); });
</script>
<template>
  <div class="caesar-world" :data-renderer="renderer" role="img" :aria-label="state.atHome ? 'ミイが おうちに ついた' : state.bridgeSolved ? 'はしが つながり、ミイが わたる' : state.stage === 1 ? 'ミイと コロが はしを なおす いせき' : `つうしんきの ひかり：${state.repaired}/3`">
    <img :src="state.stage === 1 || state.atHome ? '/caesar/bridge.webp' : '/caesar/transmitter.webp'" class="caesar-world__illustration" :class="{ 'is-machine': state.stage === 2 && !state.atHome }" alt="" width="1536" height="1024" fetchpriority="high" decoding="async" />
    <canvas :key="canvasKey" ref="canvas" aria-hidden="true" />
    <div class="caesar-world__shade" />
    <div v-if="renderer !== 'webgl'" class="adventure-world-character" :class="{ crossed: state.bridgeSolved || state.atHome }" :style="{ '--mii-position': `${state.bridgeSolved || state.atHome ? 82 : state.practice && state.footsteps > 0 ? 15 + state.footsteps * 15 : 14}%` }"><CharacterPortrait actor="mii" :happy="state.happy" /></div>
    <div v-if="renderer !== 'webgl'" class="adventure-world-character koro"><CharacterPortrait actor="koro" /></div>
    <div v-if="renderer !== 'webgl' && state.stage === 1" class="adventure-world-steps" aria-hidden="true"><i v-for="n in 4" :key="n" :class="{ active: state.bridgeSolved || n <= state.footsteps }" /></div>
    <div class="adventure-world-path" :class="{ active: state.bridgeSolved || state.atHome }" aria-hidden="true" />
    <span v-if="state.atHome" class="adventure-world-home" aria-hidden="true">⌂</span>
    <div v-if="state.word" class="adventure-world-letters" :class="{ solved: state.happy }" aria-hidden="true"><span v-for="(char, index) in state.word" :key="index">{{ char }}</span></div>
    <div v-if="state.stage === 2 && !state.atHome" class="adventure-repair-lights"><i v-for="n in 3" :key="n" :class="{ active: n <= state.repaired }" aria-hidden="true" /><span>{{ state.repaired }} / 3</span></div>
  </div>
</template>
