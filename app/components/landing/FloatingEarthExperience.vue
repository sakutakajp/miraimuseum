<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";
import type { FloatingEarthWorld } from "~/experiences/floating-earth/FloatingEarthWorld";
import { prepareDinosaurAudio } from "~/game/dinosaur/audio-context";
import { preloadDinosaurGame, discardDinosaurPreload } from "~/game/dinosaur/preload";

const root = ref<HTMLElement>();
const control = ref<HTMLButtonElement>();
const canvas = ref<HTMLCanvasElement>();
const dinosaurControl = ref<HTMLButtonElement>();
const ready = ref(false);
const pending = ref(true);
let world: FloatingEarthWorld | undefined;
let loading: AbortController | undefined;
let entering = false;

function prepareGameEntry() {
  entering = true;
  prepareDinosaurAudio();
}

function startDinosaur() {
  prepareGameEntry();
  void navigateTo({ path: "/dinosaur", query: { play: "1" } });
}

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
    if (signal.aborted || !canvas.value || !control.value || !root.value || !dinosaurControl.value) return;
    world = await FloatingEarthWorld.create(canvas.value, control.value, root.value, signal,
      { fallback, activateDinosaur: startDinosaur, dinosaurControl: dinosaurControl.value });
    if (signal.aborted) { world.dispose(); return; }
    root.value.dataset.renderer = "webgl";
    ready.value = true;
    pending.value = false;
  } catch {
    if (!signal.aborted) fallback();
  } finally {
    if (!signal.aborted) {
      void preloadRouteComponents("/dinosaur").catch(() => {});
      void preloadDinosaurGame().then(prepared => {
        if (!signal.aborted && root.value) root.value.dataset.gameReady = String(prepared);
      });
    }
  }
});

onBeforeUnmount(() => {
  loading?.abort(); world?.dispose();
  if (!entering) discardDinosaurPreload();
});
</script>

<template>
  <main ref="root" class="earth-home" data-testid="floating-earth-experience" data-renderer="static" data-earth-ready="false" data-earth-yaw="0" data-earth-pitch="0" data-dragging="false">
    <header class="earth-home__header">
      <h1 class="earth-home__title">MIRAI MUSEUM</h1>
    </header>

    <div class="earth-home__space">
      <p v-if="pending" class="earth-home__loading" role="status" aria-live="polite"><span aria-hidden="true" />Loading...</p>
      <button ref="control" class="earth-home__globe" :style="{ visibility: pending ? 'hidden' : undefined }" :aria-hidden="pending ? true : undefined" data-testid="earth-control" :disabled="!ready" :aria-label="ready ? '地球を回す' : '青い海と白い雲に包まれた地球'" :aria-describedby="ready ? 'earth-instructions' : undefined">
        <img class="earth-home__fallback" src="/floating-earth/earth-photo.webp" alt="" width="1024" height="1024" fetchpriority="high" draggable="false" />
        <canvas ref="canvas" class="earth-home__canvas" aria-hidden="true" />
      </button>
      <button ref="dinosaurControl" class="earth-home__dinosaur" data-testid="dinosaur-control" type="button" hidden disabled aria-label="ブラキオサウルスで恐竜ゲームをはじめる" @click="startDinosaur" />
    </div>

    <footer class="earth-home__footer">
      <p id="earth-instructions" class="earth-home__instructions" :class="{ 'earth-home__instructions--ready': ready }">
        <span aria-hidden="true">スクロールで回す <i>·</i> ブラキオサウルスをタップ</span>
        <span class="earth-home__sr">ゆっくり自転する地球。スクロール、地球のタップ、Enter、Spaceで回転。ドラッグ、矢印キーで向きを変更。Homeで元の向きに戻ります。ブラキオサウルスをタップするか、ブラキオサウルスのボタンにフォーカスしてEnterまたはSpaceで恐竜ゲームを開始します。</span>
      </p>
      <NuxtLink v-if="!pending && !ready" to="/dinosaur?play=1" no-prefetch class="earth-home__fallback-link" @click="prepareGameEntry">恐竜ゲームをはじめる</NuxtLink>
      <noscript><a class="earth-home__fallback-link" href="/dinosaur">恐竜ゲームをはじめる</a></noscript>
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
.earth-home__dinosaur { position: absolute; z-index: 1; padding: 0; border: 0; border-radius: 5px; background: transparent; pointer-events: none; }
.earth-home__dinosaur:focus-visible { outline: 2px solid #fff; outline-offset: 3px; }
.earth-home__fallback-link { color: #bbc4d0; font-size: 13px; text-underline-offset: 5px; }
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
