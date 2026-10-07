<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";
import type { FloatingEarthWorld } from "~/experiences/floating-earth/FloatingEarthWorld";

const root = ref<HTMLElement>();
const control = ref<HTMLButtonElement>();
const canvas = ref<HTMLCanvasElement>();
const ready = ref(false);
const pending = ref(true);
let world: FloatingEarthWorld | undefined;
let loading: AbortController | undefined;

function fallback() {
  ready.value = false;
  pending.value = false;
  if (root.value) {
    root.value.dataset.renderer = "static";
    root.value.dataset.earthReady = "false";
  }
}

onMounted(async () => {
  loading = new AbortController();
  const signal = loading.signal;
  try {
    const { FloatingEarthWorld } = await import("~/experiences/floating-earth/FloatingEarthWorld");
    if (signal.aborted || !canvas.value || !control.value || !root.value) return;
    world = await FloatingEarthWorld.create(canvas.value, control.value, root.value, signal, fallback);
    if (signal.aborted) { world.dispose(); return; }
    root.value.dataset.renderer = "webgl";
    ready.value = true;
    pending.value = false;
  } catch {
    if (!signal.aborted) fallback();
  }
});

onBeforeUnmount(() => { loading?.abort(); world?.dispose(); });
</script>

<template>
  <main ref="root" class="earth-home" data-testid="floating-earth-experience" data-renderer="static" data-earth-ready="false" data-earth-yaw="0" data-earth-pitch="0" data-dragging="false">
    <header class="earth-home__header">
      <h1 class="earth-home__title">MIRAI MUSEUM</h1>
      <NuxtLink to="/dinosaur" no-prefetch class="earth-home__entrance" aria-label="恐竜ゲームをはじめる" title="恐竜ゲームをはじめる">
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M8 5.5v13l10-6.5L8 5.5Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" /></svg>
      </NuxtLink>
    </header>

    <div class="earth-home__space">
      <p v-if="pending" class="earth-home__loading" role="status" aria-live="polite"><span aria-hidden="true" />Loading...</p>
      <button ref="control" class="earth-home__globe" data-testid="earth-control" :disabled="!ready" :aria-label="ready ? '地球を回す' : '青い海と白い雲に包まれた地球'" :aria-describedby="ready ? 'earth-instructions' : undefined">
        <img class="earth-home__fallback" src="/floating-earth/earth-photo.webp" alt="" width="1024" height="1024" fetchpriority="high" draggable="false" />
        <canvas ref="canvas" class="earth-home__canvas" aria-hidden="true" />
      </button>
    </div>

    <footer class="earth-home__footer">
      <p id="earth-instructions" class="earth-home__instructions" :class="{ 'earth-home__instructions--ready': ready }">
        <span aria-hidden="true">スクロールで回す <i>·</i> ドラッグで動かす</span>
        <span class="earth-home__sr">ゆっくり自転する地球。スクロール、タップ、Enter、Spaceで回転。ドラッグ、矢印キーで向きを変更。Homeで元の向きに戻ります。</span>
      </p>
    </footer>
  </main>
</template>

<style scoped>
:global(html:has(.earth-home)) { background: #000; }
.earth-home {
  position: relative;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  min-height: 100svh;
  height: 100dvh;
  overflow: clip;
  isolation: isolate;
  color: #f4f7ff;
  background: #000;
  font-family: "Helvetica Neue", Arial, "Hiragino Kaku Gothic ProN", "Yu Gothic", sans-serif;
  -webkit-font-smoothing: antialiased;
}
.earth-home__header {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: max(24px, env(safe-area-inset-top)) max(36px, env(safe-area-inset-right)) 12px max(36px, env(safe-area-inset-left));
}
.earth-home__title { margin: 0; color: inherit; font-family: "M PLUS Rounded 1c", sans-serif; font-size: clamp(16px, 2vw, 22px); font-weight: 700; letter-spacing: .06em; line-height: 1.5; }
.earth-home__entrance { display: grid; place-items: center; width: 44px; height: 44px; color: #b9c3d5; border: 1px solid #ffffff20; border-radius: 50%; transition: color .2s, background .2s; }
.earth-home__entrance:hover { color: #fff; background: #ffffff0a; }
.earth-home__entrance svg { width: 22px; height: 22px; }
.earth-home__loading { position: absolute; z-index: 2; bottom: 12px; display: flex; gap: 10px; align-items: center; color: #d9e7ff; font-size: 13px; letter-spacing: .08em; }
.earth-home__loading span { width: 14px; height: 14px; border: 1px solid #ffffff30; border-top-color: #a5deff; border-radius: 50%; animation: earth-loading 1s linear infinite; }
@keyframes earth-loading { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) { .earth-home__loading span { animation: none; } }
.earth-home__space { position: relative; display: grid; place-items: center; min-height: 0; }
.earth-home__globe {
  position: relative;
  display: block;
  flex-shrink: 0;
  width: min(96vw, calc(100dvh - 150px), 1040px);
  height: auto;
  aspect-ratio: 1;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: transparent;
  cursor: grab;
  touch-action: pinch-zoom;
  user-select: none;
  -webkit-user-select: none;
}
.earth-home__globe:disabled { cursor: default; touch-action: auto; }
.earth-home[data-dragging="true"] .earth-home__globe { cursor: grabbing; }
.earth-home__canvas, .earth-home__fallback { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; }
.earth-home__fallback { filter: drop-shadow(0 0 18px #168eff80) drop-shadow(0 0 34px #087bff50); }
.earth-home__canvas { opacity: 0; }
.earth-home[data-renderer="webgl"] .earth-home__canvas { opacity: 1; }
.earth-home[data-renderer="webgl"] .earth-home__fallback { opacity: 0; }
.earth-home__footer { position: relative; z-index: 1; padding: 12px 20px max(30px, env(safe-area-inset-bottom)); text-align: center; }
.earth-home__instructions { margin-top: 10px; font-size: 12px; font-weight: 400; line-height: 1.6; letter-spacing: .04em; color: #a1abc0; visibility: hidden; }
.earth-home__instructions--ready { visibility: visible; }
.earth-home__instructions i { font-style: normal; margin: 0 9px; opacity: .6; }
.earth-home__sr { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; border: 0; }
.earth-home a:focus-visible, .earth-home__globe:focus-visible { outline: 2px solid #62dfff; outline-offset: 6px; }
@media (max-width: 600px) {
  .earth-home__header { gap: 12px; padding: max(18px, env(safe-area-inset-top)) max(20px, env(safe-area-inset-right)) 8px max(20px, env(safe-area-inset-left)); }

  .earth-home__footer { padding-bottom: max(40px, env(safe-area-inset-bottom)); }
  .earth-home__instructions { font-size: 12px; }
}
@media (max-height: 500px) and (orientation: landscape) {
  .earth-home__header { padding-top: max(8px, env(safe-area-inset-top)); padding-bottom: 0; }
  .earth-home__globe { width: min(60vw, calc(100dvh - 112px)); }
  .earth-home__footer { padding: 2px 20px max(8px, env(safe-area-inset-bottom)); }
  .earth-home__instructions { margin-top: 2px; font-size: 11px; }
}
</style>
