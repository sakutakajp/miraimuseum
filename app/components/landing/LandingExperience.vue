<script setup lang="ts">
import { ExperienceDirector } from "~/experiences/landing/ExperienceDirector";
import type { LandingScene, CoreState } from "~/experiences/landing/types";
import ThresholdContent from "./scenes/ThresholdContent.vue";
import ScaleShiftLabels from "./scenes/ScaleShiftLabels.vue";
import ConnectedStatement from "./scenes/ConnectedStatement.vue";
import LandingSoundToggle from "./LandingSoundToggle.vue";
import StaticCore from "./StaticCore.vue";

const root = ref<HTMLElement>();
const canvas = ref<HTMLCanvasElement>();
const scene = ref<LandingScene>("threshold");
const coreState = ref<CoreState>("");
const noScriptMarkup =
  '<div class="landing-nojs"><p>すべての学問は、つながっている。</p><p>宇宙も、生命も、数も、機械も。<br>見方を変えれば、同じ世界の一部になる。</p><a href="/museum">博物館へ →</a></div>';
let director: ExperienceDirector | undefined;
let disposed = false;
onMounted(async () => {
  if (!root.value || !canvas.value) return;
  director = new ExperienceDirector(root.value, (state) => {
    scene.value = state.scene;
    coreState.value = state.coreState;
  });
  root.value.dataset.enhanced = "true";
  if (director.state.quality === "static") {
    director.fail();
    return;
  }
  try {
    // Only the enhancement is lazy. All copy and entry links are server-rendered.
    const { MuseumWorld } =
      await import("~/experiences/landing/three/MuseumWorld");
    if (disposed || !director || !canvas.value) return;
    const world = new MuseumWorld(
      canvas.value,
      director.state,
      () => director?.pixelRatio() ?? 1,
      director.fail,
    );
    director.attach(world);
    if (director.quality.tier !== "static")
      root.value.dataset.renderer = "webgl";
  } catch {
    director?.fail();
  }
});
onBeforeUnmount(() => {
  disposed = true;
  director?.dispose();
  director = undefined;
});
</script>
<template>
  <main
    ref="root"
    class="landing"
    data-testid="landing-experience"
    data-scene="threshold"
    data-renderer="static"
    data-enhanced="false"
  >
    <div class="landing-stage">
      <div class="landing-visual" aria-hidden="true">
        <StaticCore />
        <canvas ref="canvas" class="landing-canvas" aria-hidden="true" />
        <div class="landing-grain" />
      </div>
      <header class="landing-nav">
        <NuxtLink
          class="landing-monogram"
          to="/"
          aria-label="MIRAI MUSEUM ホーム"
        >
          <svg viewBox="0 0 40 28" aria-hidden="true">
            <path d="M2 26V2l9 12L20 2v24M20 26V2l9 12L38 2v24" />
          </svg>
          <span>MM / 000</span>
        </NuxtLink>
        <div class="landing-nav-right">
          <NuxtLink class="landing-museum-link" to="/museum" no-prefetch
            >博物館へ <span aria-hidden="true">↗</span></NuxtLink
          >
          <LandingSoundToggle />
        </div>
      </header>
      <div class="landing-dom">
        <ThresholdContent />
        <ScaleShiftLabels :state="coreState" />
        <ConnectedStatement :active="scene === 'connected'" />
      </div>
      <div class="landing-folio" aria-hidden="true">
        <span>{{
          scene === "threshold"
            ? "00 — THRESHOLD"
            : scene === "scale-shift"
              ? "01 — SCALE SHIFT"
              : "02 — EVERYTHING IS CONNECTED"
        }}</span>
        <span class="landing-folio-line" /><span>00 — 02</span>
      </div>
    </div>
    <noscript v-html="noScriptMarkup" />
  </main>
</template>
