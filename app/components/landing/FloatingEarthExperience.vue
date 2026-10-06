<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";
import type { FloatingEarthWorld } from "~/experiences/floating-earth/FloatingEarthWorld";

const root = ref<HTMLElement>();
const control = ref<HTMLButtonElement>();
const canvas = ref<HTMLCanvasElement>();
const ready = ref(false);
let world: FloatingEarthWorld | undefined;
let loading: AbortController | undefined;

function fallback() {
  ready.value = false;
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
  } catch {
    if (!signal.aborted) fallback();
  }
});

onBeforeUnmount(() => { loading?.abort(); world?.dispose(); });
</script>

<template>
  <main ref="root" class="earth-home" data-testid="floating-earth-experience" data-renderer="static" data-earth-ready="false" data-earth-yaw="0" data-earth-pitch="0" data-dragging="false">
    <header class="earth-home__header">
      <NuxtLink to="/" class="earth-home__brand" aria-label="MIRAI MUSEUM ホーム">
        <svg viewBox="0 0 30 24" fill="none" aria-hidden="true"><path d="M2 22V2l13 14L28 2v20M9 22V12l6 7 6-7v10" stroke="currentColor" stroke-width="1.3" /></svg>
        <span>MIRAI MUSEUM</span>
      </NuxtLink>
      <NuxtLink to="/museum" no-prefetch class="earth-home__entrance">博物館へ <span aria-hidden="true">↗</span></NuxtLink>
    </header>

    <div class="earth-home__space">
      <h1 class="earth-home__sr">MIRAI MUSEUM — 世界に、触れる。</h1>
      <button ref="control" class="earth-home__globe" data-testid="earth-control" :disabled="!ready" :aria-label="ready ? '地球を回す' : '青い海と白い雲に包まれた地球'" :aria-describedby="ready ? 'earth-instructions' : undefined">
        <img class="earth-home__fallback" src="/floating-earth/earth.svg" alt="" width="1024" height="1024" fetchpriority="high" draggable="false" />
        <canvas ref="canvas" class="earth-home__canvas" aria-hidden="true" />
      </button>
    </div>

    <footer class="earth-home__footer">
      <p class="earth-home__invitation">世界に、触れる。</p>
      <p id="earth-instructions" class="earth-home__instructions" :class="{ 'earth-home__instructions--ready': ready }">
        <span aria-hidden="true">タップで回す <i>·</i> ドラッグで動かす</span>
        <span class="earth-home__sr">タップ、Enter、Spaceで回転。ドラッグ、矢印キーで向きを変更。Homeで元の向きに戻ります。</span>
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
.earth-home__brand, .earth-home__entrance {
  display: inline-flex;
  align-items: center;
  color: inherit;
  text-decoration: none;
  min-height: 44px;
}
.earth-home__brand { gap: 13px; font-size: 12px; font-weight: 500; letter-spacing: 0.14em; white-space: nowrap; }
.earth-home__brand svg { width: 27px; height: 22px; }
.earth-home__entrance { gap: 18px; padding: 0 17px; border: 1px solid #ffffff29; border-radius: 30px; font-size: 13px; letter-spacing: 0.05em; transition: border-color .2s, background .2s; }
.earth-home__entrance:hover { border-color: #ffffff70; background: #ffffff0a; }
.earth-home__entrance span { font-size: 19px; line-height: 1; }
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
.earth-home__canvas { opacity: 0; }
.earth-home[data-renderer="webgl"] .earth-home__canvas { opacity: 1; }
.earth-home[data-renderer="webgl"] .earth-home__fallback { opacity: 0; }
.earth-home__footer { position: relative; z-index: 1; padding: 12px 20px max(30px, env(safe-area-inset-bottom)); text-align: center; }
.earth-home__invitation { color: #e8edfa; font-size: 15px; font-weight: 400; letter-spacing: .23em; line-height: 1.6; }
.earth-home__instructions { margin-top: 10px; font-size: 12px; font-weight: 400; line-height: 1.6; letter-spacing: .04em; color: #a1abc0; visibility: hidden; }
.earth-home__instructions--ready { visibility: visible; }
.earth-home__instructions i { font-style: normal; margin: 0 9px; opacity: .6; }
.earth-home__sr { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; border: 0; }
.earth-home a:focus-visible, .earth-home__globe:focus-visible { outline: 2px solid #62dfff; outline-offset: 6px; }
@media (max-width: 600px) {
  .earth-home__header { gap: 12px; padding: max(18px, env(safe-area-inset-top)) max(20px, env(safe-area-inset-right)) 8px max(20px, env(safe-area-inset-left)); }
  .earth-home__brand { font-size: 12px; gap: 9px; letter-spacing: .1em; }
  .earth-home__brand svg { width: 22px; height: 20px; }
  .earth-home__entrance { gap: 9px; font-size: 12px; padding: 0 12px; }
  .earth-home__footer { padding-bottom: max(40px, env(safe-area-inset-bottom)); }
  .earth-home__instructions { font-size: 12px; }
}
@media (max-height: 500px) and (orientation: landscape) {
  .earth-home__header { padding-top: max(8px, env(safe-area-inset-top)); padding-bottom: 0; }
  .earth-home__globe { width: min(60vw, calc(100dvh - 112px)); }
  .earth-home__footer { padding: 2px 20px max(8px, env(safe-area-inset-bottom)); }
  .earth-home__invitation { font-size: 12px; }
  .earth-home__instructions { margin-top: 2px; font-size: 11px; }
}
</style>
