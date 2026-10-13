<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import type { NycDioramaWorld } from "~/experiences/nyc-diorama/NycDioramaWorld";
import type { CameraLimits, CameraState, DioramaMode } from "~/experiences/nyc-diorama/types";

const props = defineProps<{ mode: DioramaMode; limits: CameraLimits }>();
const emit = defineEmits<{
  camera: [CameraState]; select: [string | null]; ready: []; error: [string];
}>();
const canvas = ref<HTMLCanvasElement>();
const pending = ref(false);
const error = ref("");
let world: NycDioramaWorld | undefined;
let loading: AbortController | undefined;
let mounted = false;

async function initialize() {
  if (!mounted || props.mode === "original" || world || pending.value || !canvas.value) return;
  loading = new AbortController();
  const signal = loading.signal;
  pending.value = true; error.value = "";
  try {
    const { NycDioramaWorld } = await import("~/experiences/nyc-diorama/NycDioramaWorld");
    if (signal.aborted || !canvas.value) return;
    const created = await NycDioramaWorld.create(canvas.value, signal, {
      camera: state => emit("camera", state), select: name => emit("select", name),
      error: message => { error.value = message; emit("error", message); },
    });
    if (signal.aborted) { created.dispose(); return; }
    world = created; world.setLimits(props.limits); world.setMode(props.mode);
    emit("ready");
  } catch (cause) {
    if (!signal.aborted) {
      error.value = cause instanceof Error ? cause.message : "3D描画を初期化できませんでした。";
      emit("error", error.value);
    }
  } finally { if (!signal.aborted) pending.value = false; }
}
function retry() { loading?.abort(); world?.dispose(); world = undefined; pending.value = false; void initialize(); }
watch(() => props.mode, mode => { world?.setMode(mode); if (!world) void initialize(); });
watch(() => [props.limits.yaw, props.limits.pitch], () => world?.setLimits(props.limits));
onMounted(() => { mounted = true; void initialize(); });
onBeforeUnmount(() => { mounted = false; loading?.abort(); world?.dispose(); });
defineExpose({ reset: () => world?.reset(), zoomBy: (factor: number) => world?.zoomBy(factor) });
</script>

<template>
  <div class="nyc-renderer" :data-ready="Boolean(world) && !pending && !error" :data-mode="mode">
    <canvas ref="canvas" :style="{ visibility: pending || error ? 'hidden' : undefined }" aria-label="ニューヨークの箱庭。ドラッグで視点、ホイールやピンチでズーム。矢印キーで視点、プラス・マイナスでズーム、Homeでリセット。" :aria-hidden="mode === 'original'" :tabindex="mode === 'original' ? -1 : 0" />
    <p v-if="pending && mode !== 'original'" class="nyc-renderer__notice" role="status">箱庭を準備しています…</p>
    <div v-if="error && mode !== 'original'" class="nyc-renderer__notice" role="alert">
      <p>{{ error }}</p>
      <button type="button" @click="retry">再試行</button>
    </div>
  </div>
</template>

<style scoped>
.nyc-renderer, canvas { position: absolute; inset: 0; width: 100%; height: 100%; }
canvas { display: block; touch-action: none; cursor: grab; outline: none; }
canvas[data-dragging="true"] { cursor: grabbing; }
canvas:focus-visible { outline: 2px solid #36536d; outline-offset: -4px; border-radius: 12px; }
.nyc-renderer__notice { position: absolute; inset: auto 20px 22px; padding: 14px 18px; border-radius: 12px; background: #ffffffed; color: #36536d; font-size: 13px; line-height: 1.7; text-align: center; }
.nyc-renderer__notice button { margin-top: 8px; padding: 6px 16px; border: 1px solid #bac9d2; border-radius: 20px; }
</style>
