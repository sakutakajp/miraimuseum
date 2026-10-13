<script setup lang="ts">
import { computed, reactive, ref } from "vue";
import type { CameraState, DioramaMode } from "~/experiences/nyc-diorama/types";

useHead({ title: "ニューヨーク箱庭 — みらい博物館 LAB", meta: [{ name: "robots", content: "noindex" }] });
const mode = ref<DioramaMode>("original");
const renderer = ref<{ reset: () => void; zoomBy: (factor: number) => void }>();
const camera = ref<CameraState>({ yaw: 0, pitch: 0, zoom: 1 });
const limits = reactive({ yaw: 10, pitch: 5 });
const selected = ref<string | null>(null);
const overlay = ref(false);
const opacity = ref(0.5);
const ready = ref(false);
const tabs: { mode: DioramaMode; title: string; tag: string }[] = [
  { mode: "original", title: "元画像", tag: "REFERENCE" },
  { mode: "projection", title: "Camera Projection", tag: "A" },
  { mode: "parallax", title: "2.5D Parallax", tag: "B" },
];
const description = computed(() => ({ original: "この1枚の美しさを、基準に。", projection: "画像を立体の表面に投影。少しずつ視点を変えてみてください。", parallax: "切り抜いた画像を奥行きに配置。レイヤーの視差を見比べてください。" })[mode.value]);
const signed = (value: number) => `${value > 0.04 ? "+" : ""}${Math.abs(value) < 0.04 ? "0.0" : value.toFixed(1)}°`;
function changeMode(next: DioramaMode) { mode.value = next; selected.value = null; }
function moveTab(event: KeyboardEvent) {
  if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
  event.preventDefault();
  const index = tabs.findIndex(tab => tab.mode === mode.value);
  const next = event.key === "Home" ? 0 : event.key === "End" ? 2 : (index + (event.key === "ArrowRight" ? 1 : 2)) % 3;
  changeMode(tabs[next]!.mode);
  document.getElementById(`nyc-tab-${tabs[next]!.mode}`)?.focus();
}
</script>

<template>
  <main class="nyc-lab">
    <header class="nyc-lab__header">
      <NuxtLink to="/" class="nyc-lab__brand" no-prefetch>MIRAI MUSEUM <span>LAB</span></NuxtLink>
      <span class="nyc-lab__edition">IMAGE TO DIORAMA · 01</span>
    </header>
    <section class="nyc-lab__intro" aria-labelledby="nyc-title">
      <p class="nyc-lab__eyebrow">NEW YORK, IN MINIATURE</p>
      <h1 id="nyc-title">1枚のニューヨークに、奥行きを。</h1>
      <p>元画像の美しさと、2つの立体表現を見比べる。</p>
    </section>

    <nav class="nyc-lab__tabs" role="tablist" aria-label="箱庭の表示方式" @keydown="moveTab">
      <button v-for="tab in tabs" :id="`nyc-tab-${tab.mode}`" :key="tab.mode" type="button" role="tab"
        :aria-selected="mode === tab.mode" :tabindex="mode === tab.mode ? 0 : -1" aria-controls="nyc-viewer"
        @click="changeMode(tab.mode)"><span class="nyc-lab__tab-tag">{{ tab.tag }}</span>{{ tab.title }}</button>
    </nav>
    <p class="nyc-lab__description">{{ description }}</p>

    <section id="nyc-viewer" class="nyc-lab__viewer" role="tabpanel" :aria-labelledby="`nyc-tab-${mode}`" :data-mode="mode">
      <img v-show="mode === 'original' || !ready" class="nyc-lab__source" src="/diorama/nyc-source.png" width="1254" height="1254" alt="パステルブルーの背景に、白い台座、ニューヨークの高層ビル、公園、ブルックリン橋、船と黄色いタクシーが並ぶミニチュア都市" fetchpriority="high" draggable="false" />
      <ClientOnly>
        <LazyLabNycDioramaCanvas ref="renderer" v-show="mode !== 'original'" :mode="mode" :limits="limits"
          @camera="camera = $event" @select="selected = $event" @ready="ready = true" @error="ready = false" />
      </ClientOnly>
      <img v-if="mode !== 'original' && overlay" class="nyc-lab__overlay" src="/diorama/nyc-source.png" width="1254" height="1254" alt="" aria-hidden="true" draggable="false" :style="{ opacity, transform: `scale(${camera.zoom})` }" />
      <div v-if="selected && mode !== 'original'" class="nyc-lab__selected" role="status">
        <span>{{ selected }}</span><button type="button" aria-label="建物名を閉じる" @click="selected = null">×</button>
      </div>
      <div v-if="mode !== 'original' && ready" class="nyc-lab__zoom">
        <button type="button" aria-label="拡大" @click="renderer?.zoomBy(1.12)">+</button>
        <button type="button" aria-label="縮小" @click="renderer?.zoomBy(1 / 1.12)">−</button>
      </div>
    </section>

    <div class="nyc-lab__below">
      <p class="nyc-lab__instructions">{{ mode === 'original' ? '基準画像 · 1254 × 1254' : 'ドラッグで視点 · ピンチ / ホイールでズーム · 建物をタップ' }}</p>
      <p v-if="mode !== 'original'" class="nyc-lab__angles" aria-label="現在のカメラ角度">左右 {{ signed(camera.yaw) }} <span>·</span> 上下 {{ signed(camera.pitch) }} <span>·</span> {{ Math.round(camera.zoom * 100) }}%</p>
    </div>
    <div class="nyc-lab__toolbar">
      <label class="nyc-lab__compare"><input v-model="overlay" type="checkbox" :disabled="mode === 'original'" />元画像を重ねる</label>
      <label v-if="overlay && mode !== 'original'" class="nyc-lab__opacity">濃さ <input v-model.number="opacity" type="range" min="0" max="1" step="0.05" aria-label="元画像の重ね合わせ濃度" /></label>
      <button class="nyc-lab__reset" type="button" :disabled="mode === 'original' || !ready" @click="renderer?.reset()"><span aria-hidden="true">↺</span> 基準視点に戻す</button>
    </div>

    <details class="nyc-lab__settings">
      <summary>視点の可動範囲を調整</summary>
      <div>
        <label>左右 <input v-model.number="limits.yaw" type="range" min="0" max="20" step="1" aria-label="左右の回転角度制限" /><output>±{{ limits.yaw }}°</output></label>
        <label>上下 <input v-model.number="limits.pitch" type="range" min="0" max="10" step="1" aria-label="上下の回転角度制限" /><output>±{{ limits.pitch }}°</output></label>
      </div>
      <p>標準は左右±10°・上下±5°。範囲を広げると、切り抜きの境界や未撮影の面が見えやすくなります。</p>
    </details>
    <footer class="nyc-lab__footer">みらい博物館 <span>／</span> 箱庭の表現を探る実験室</footer>
  </main>
</template>

<style scoped>
:global(html:has(.nyc-lab)) { background: #f5f7f8; }
:global(body:has(.nyc-lab)) { margin: 0; }
.nyc-lab, .nyc-lab * { box-sizing: border-box; }
:where(.nyc-lab h1, .nyc-lab p) { margin: 0; }
:where(.nyc-lab button) { border: 0; background: transparent; font: inherit; color: inherit; cursor: pointer; }
.nyc-lab { min-height: 100svh; padding: 0 28px max(24px, env(safe-area-inset-bottom)); background: #f5f7f8; color: #2c4353; font-family: "Helvetica Neue", Arial, "Hiragino Kaku Gothic ProN", "Yu Gothic", sans-serif; font-weight: 400; -webkit-font-smoothing: antialiased; }
.nyc-lab__header { display: flex; align-items: center; justify-content: space-between; max-width: 1280px; min-height: 84px; margin: auto; border-bottom: 1px solid #dce4e8; }
.nyc-lab__brand { color: #2c4353; text-decoration: none; font-size: 13px; font-weight: 600; letter-spacing: .09em; }
.nyc-lab__brand span { margin-left: 9px; padding: 3px 6px; border: 1px solid #bacbd5; border-radius: 4px; font-size: 9px; font-weight: 400; letter-spacing: .08em; }
.nyc-lab__edition { color: #8195a0; font-size: 10px; letter-spacing: .14em; }
.nyc-lab__intro { padding: 38px 0 28px; text-align: center; }
.nyc-lab__eyebrow { margin-bottom: 13px; color: #71909f; font-size: 10px; letter-spacing: .24em; }
.nyc-lab__intro h1 { font-size: clamp(20px, 2.2vw, 29px); font-weight: 500; letter-spacing: .04em; line-height: 1.6; }
.nyc-lab__intro > p:last-child { margin-top: 9px; color: #7b909e; font-size: 12px; line-height: 1.8; }
.nyc-lab__tabs { display: flex; justify-content: center; gap: 4px; width: fit-content; max-width: 100%; margin: auto; padding: 5px; border: 1px solid #d9e3e9; border-radius: 30px; background: #eaf0f3; }
.nyc-lab__tabs button { display: flex; align-items: center; gap: 8px; min-height: 40px; padding: 10px 20px; border-radius: 24px; color: #758894; font-size: 12px; white-space: nowrap; }
.nyc-lab__tabs button[aria-selected="true"] { background: #fff; color: #2e5368; box-shadow: 0 2px 8px #2844540b; }
.nyc-lab__tab-tag { font-size: 9px; color: #9bacb5; letter-spacing: .05em; }
.nyc-lab__description { min-height: 42px; padding: 15px 0 12px; color: #8296a2; font-size: 11px; line-height: 1.7; text-align: center; }
.nyc-lab__viewer { position: relative; width: min(100%, 770px); aspect-ratio: 1; margin: 0 auto; overflow: hidden; border-radius: 14px; background: #aedbf7; isolation: isolate; }
.nyc-lab__source, .nyc-lab__overlay { position: absolute; inset: 0; display: block; width: 100%; height: 100%; object-fit: contain; user-select: none; pointer-events: none; }
.nyc-lab__overlay { z-index: 2; transform-origin: center; }
.nyc-lab__selected { position: absolute; z-index: 3; left: 50%; bottom: 20px; display: flex; align-items: center; gap: 12px; max-width: calc(100% - 90px); padding: 8px 8px 8px 18px; border: 1px solid #ffffffaa; border-radius: 28px; background: #ffffffec; box-shadow: 0 4px 16px #324f6b14; color: #2e4f62; font-size: 12px; transform: translateX(-50%); }
.nyc-lab__selected button { flex-shrink: 0; width: 30px; height: 30px; border-radius: 50%; font-size: 20px; }
.nyc-lab__zoom { position: absolute; z-index: 3; right: 16px; bottom: 16px; display: grid; overflow: hidden; border: 1px solid #ffffff99; border-radius: 24px; background: #ffffffdd; }
.nyc-lab__zoom button { width: 40px; height: 40px; color: #526c7e; font-size: 20px; font-weight: 300; }
.nyc-lab__zoom button + button { border-top: 1px solid #dce5ec; }
.nyc-lab__below, .nyc-lab__toolbar, .nyc-lab__settings { max-width: 770px; margin-right: auto; margin-left: auto; }
.nyc-lab__below { display: flex; justify-content: space-between; flex-wrap: wrap; gap: 8px; padding: 15px 0; color: #7e929e; font-size: 10px; line-height: 1.8; }
.nyc-lab__angles { font-variant-numeric: tabular-nums; }
.nyc-lab__angles span { margin: 0 5px; color: #b4c3cd; }
.nyc-lab__toolbar { display: flex; flex-wrap: wrap; align-items: center; gap: 14px; padding: 8px 0 18px; border-bottom: 1px solid #dce4e8; font-size: 11px; color: #5d798b; }
.nyc-lab__compare { display: flex; align-items: center; gap: 8px; min-height: 40px; cursor: pointer; }
.nyc-lab__compare input { width: 15px; height: 15px; margin: 0; accent-color: #527e96; }
.nyc-lab__compare:has(input:disabled) { opacity: .4; cursor: default; }
.nyc-lab__opacity { display: flex; align-items: center; gap: 8px; }
.nyc-lab__opacity input { width: 90px; accent-color: #527e96; }
.nyc-lab__reset { min-height: 40px; margin-left: auto; padding: 8px 16px; border: 1px solid #d3dfe6; border-radius: 24px; color: #557387; font-size: 11px; }
.nyc-lab__reset span { margin-right: 5px; font-size: 15px; }
.nyc-lab__reset:disabled { opacity: .35; }
.nyc-lab__settings { margin-top: 18px; font-size: 11px; color: #8196a4; }
.nyc-lab__settings summary { width: fit-content; padding: 4px 0; cursor: pointer; }
.nyc-lab__settings > div { display: flex; flex-wrap: wrap; gap: 25px; padding: 20px 0 10px; }
.nyc-lab__settings label { display: flex; align-items: center; gap: 12px; }
.nyc-lab__settings input { width: 130px; accent-color: #527e96; }
.nyc-lab__settings output { min-width: 35px; color: #557387; font-variant-numeric: tabular-nums; }
.nyc-lab__settings p { font-size: 10px; line-height: 1.8; }
.nyc-lab__footer { padding: 38px 0 0; color: #a1afb8; font-size: 10px; text-align: center; }
.nyc-lab__footer span { margin: 0 6px; color: #c4cfd5; }
.nyc-lab button, .nyc-lab a, .nyc-lab summary, .nyc-lab input { touch-action: manipulation; }
.nyc-lab button:focus-visible, .nyc-lab a:focus-visible, .nyc-lab summary:focus-visible, .nyc-lab input:focus-visible { outline: 2px solid #527e96; outline-offset: 3px; }
@media (min-width: 1000px) and (min-height: 700px) { .nyc-lab__viewer { width: min(770px, calc(100vh - 360px)); min-width: 500px; } .nyc-lab__below, .nyc-lab__toolbar, .nyc-lab__settings { max-width: min(770px, max(500px, calc(100vh - 360px))); } }
@media (min-width: 1000px) and (max-height: 850px) {
  .nyc-lab__viewer { width: min(500px, max(300px, calc(100svh - 225px))); min-width: 0; }
  .nyc-lab__below, .nyc-lab__toolbar, .nyc-lab__settings { max-width: min(500px, max(300px, calc(100svh - 225px))); }
  .nyc-lab__header { min-height: 52px; }
  .nyc-lab__intro { padding: 14px 0 16px; }
  .nyc-lab__intro h1 { font-size: 22px; }
  .nyc-lab__eyebrow, .nyc-lab__intro > p:last-child { display: none; }
  .nyc-lab__description { min-height: 34px; padding: 10px 0; }
}
@media (max-width: 600px) {
  .nyc-lab { padding-right: 16px; padding-left: 16px; }
  .nyc-lab__header { min-height: 65px; }
  .nyc-lab__brand { font-size: 11px; }
  .nyc-lab__edition { font-size: 8px; letter-spacing: .04em; }
  .nyc-lab__intro { padding: 30px 0 23px; }
  .nyc-lab__intro h1 { font-size: clamp(17px, 4.7vw, 22px); }
  .nyc-lab__tabs { width: 100%; justify-content: space-between; gap: 1px; padding: 4px; }
  .nyc-lab__tabs button { justify-content: center; gap: 5px; min-height: 40px; padding: 8px 10px; font-size: 10px; }
  .nyc-lab__tab-tag { font-size: 8px; }
  .nyc-lab__tabs button:first-child .nyc-lab__tab-tag { display: none; }
  .nyc-lab__description { min-height: 53px; padding-top: 15px; font-size: 10px; }
  .nyc-lab__viewer { border-radius: 10px; }
  .nyc-lab__below { flex-direction: column; gap: 4px; padding: 12px 0; font-size: 9px; }
  .nyc-lab__toolbar { gap: 9px; padding-bottom: 12px; }
  .nyc-lab__opacity { order: 3; width: 100%; }
  .nyc-lab__opacity input { width: 160px; }
  .nyc-lab__reset { padding-right: 12px; padding-left: 12px; font-size: 10px; }
  .nyc-lab__selected { bottom: 14px; max-width: calc(100% - 85px); padding-left: 12px; font-size: 10px; }
  .nyc-lab__zoom { right: 12px; bottom: 12px; }
  .nyc-lab__settings > div { gap: 18px; }
  .nyc-lab__footer { padding-top: 30px; }
}
</style>
