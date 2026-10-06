<script setup lang="ts">
import { TresCanvas, type TresRendererSetupContext } from "@tresjs/core";
import { unref } from "vue";
import { StarDiveRuntime } from "~/games/star-dive/StarDiveRuntime";
import { AudioEngine } from "~/games/star-dive/audio/AudioEngine";
import { InputController } from "~/games/star-dive/input/InputController";
import { createWebGL2Renderer } from "~/games/star-dive/visual/renderer";
import { sections } from "~/games/star-dive/config";
import type { Quality } from "~/games/star-dive/performance/PerformanceManager";
import type { StageResult } from "~/games/catalog";
import StarDiveWorld from "./games/star-dive/StarDiveWorld.client.vue";
import StarDiveHud from "./games/star-dive/StarDiveHud.vue";
const props = defineProps<{ demo: boolean }>();
const emit = defineEmits<{ finish: [result: StageResult]; leave: [] }>();
const { t } = useLanguage();
const runtime = markRaw(new StarDiveRuntime()),
  audio = new AudioEngine(),
  input = new InputController(runtime.player);
const state = shallowRef(runtime.snapshot()),
  host = ref<HTMLElement>(),
  ready = ref(false),
  paused = ref(false),
  error = ref(false),
  muted = ref(false),
  reduced = ref(false),
  touched = ref(false);
const debug =
  import.meta.dev &&
  typeof location !== "undefined" &&
  new URLSearchParams(location.search).has("starDiveDebug");
const quality = ref<Quality>("medium"),
  fps = ref(60),
  collisions = ref(false),
  invincible = ref(false),
  speed = ref("1");
let snapshotAt = -1,
  lastEvent = 0,
  done = false,
  disposed = false;
let finishTimer: ReturnType<typeof setTimeout> | undefined;
let startupTimer: ReturnType<typeof setTimeout> | undefined;
let media: MediaQueryList | undefined;
let audioUnlock: Promise<void> | undefined;
let audioClockAttached = false;
const eventLabel = computed(() => {
  const e = state.value.event;
  if (!e || state.value.time - e.time > 0.75) return "";
  if (e.kind === "near") return `NEAR · ${e.label}`;
  if (e.kind === "destroy") return `+${e.points}`;
  if (e.kind === "gate") return "GATE OPEN";
  if (e.kind === "discovery") return "DISCOVERY";
  if (e.kind === "climax") return "MIRAI BURST";
  return "";
});
const chapter = computed(
  () =>
    ({
      dive: "DIVE",
      "first-contact": "FIRST CONTACT",
      "asteroid-field": "ASTEROID FIELD",
      risk: "RISK",
      inside: "INSIDE",
      "break-out": "BREAK OUT",
    })[state.value.section],
);
function renderer(context: TresRendererSetupContext) {
  try {
    return createWebGL2Renderer(unref(context.canvas));
  } catch (e) {
    failRenderer();
    throw e;
  }
}
function failRenderer() {
  error.value = true;
  runtime.clock.pause();
  audio.pause();
  clearTimeout(startupTimer);
}
onErrorCaptured(() => {
  failRenderer();
  return false;
});
function start() {
  ready.value = true;
  clearTimeout(startupTimer);
  runtime.clock.start();
  if (!props.demo) runtime.seek(10.5);
  if (audio.context?.state === "running") audio.start(runtime.clock.time);
  if (document.hidden) pause();
}
async function unlockAudio() {
  if (audioClockAttached && audio.context?.state === "running") return;
  if (audioUnlock) {
    void audio.unlock();
    return audioUnlock;
  }
  audioUnlock = (async () => {
    await audio.unlock();
    if (
      disposed ||
      error.value ||
      paused.value ||
      !audio.context ||
      audio.context.state !== "running"
    )
      return;
    runtime.clock.useSource(() => audio.context?.currentTime ?? 0);
    audioClockAttached = true;
    if (ready.value) audio.start(runtime.clock.time);
  })();
  try {
    await audioUnlock;
  } finally {
    audioUnlock = undefined;
  }
}
function pointerDown(event: PointerEvent) {
  if (paused.value || error.value || !ready.value || done) return;
  touched.value = true;
  void unlockAudio();
  input.down(event);
  host.value?.setPointerCapture(event.pointerId);
}
function pointerMove(event: PointerEvent) {
  if (!paused.value && host.value)
    input.move(event, host.value.getBoundingClientRect());
}
function pointerUp(event: PointerEvent) {
  input.up(event);
  if (host.value?.hasPointerCapture(event.pointerId))
    host.value.releasePointerCapture(event.pointerId);
}
function beforeStep(dt: number) {
  input.update(Math.min(dt, 0.05));
}
function frame(tier: Quality, measuredFps: number) {
  if (disposed || done || !ready.value) return;
  audio.risk = runtime.score.risk;
  audio.section = runtime.director.section;
  for (const event of runtime.events)
    if (event.id > lastEvent) {
      audio.effect(event, event.kind === "near" ? "sixteenth" : "none");
      lastEvent = event.id;
    }
  const time = runtime.clock.time;
  if (time - snapshotAt >= 0.08 || runtime.finished) {
    state.value = runtime.snapshot(tier);
    fps.value = measuredFps;
    snapshotAt = time;
  }
  if (runtime.finished) {
    done = true;
    runtime.clock.pause();
    input.clear();
    finishTimer = setTimeout(
      () => {
        if (!disposed)
          emit("finish", {
            game: "star-flight",
            stage: 1,
            cleared: runtime.cleared,
            score: runtime.score.score,
            health: runtime.player.shield,
            elapsed: Math.min(80, time),
            stats: {
              maxChain: runtime.score.maxChain,
              near: runtime.score.nearCount,
            },
            discoveries: runtime.cleared ? ["asteroid"] : [],
          });
      },
      runtime.cleared ? 350 : 800,
    );
  }
}
function pause() {
  if (done) return;
  paused.value = true;
  runtime.clock.pause();
  audio.pause();
  input.clear();
}
async function resume() {
  if (document.hidden) return;
  await audio.unlock();
  if (disposed) return;
  if (audio.context?.state === "running") {
    runtime.clock.useSource(() => audio.context?.currentTime ?? 0);
    audioClockAttached = true;
  }
  paused.value = false;
  runtime.clock.resume();
  audio.start(runtime.clock.time);
}
function mute() {
  muted.value = !muted.value;
  audio.setMuted(muted.value);
  if (!muted.value && !paused.value) void unlockAudio();
}
function visibility() {
  if (document.hidden) pause();
}
function keyDown(event: KeyboardEvent) {
  if (error.value || !ready.value || done) return;
  if (event.key === "Escape") {
    event.preventDefault();
    paused.value ? void resume() : pause();
    return;
  }
  if (
    /^(Arrow|[wasd]$)/i.test(event.key) &&
    !(event.target instanceof HTMLSelectElement)
  ) {
    event.preventDefault();
    touched.value = true;
    if (!paused.value) {
      input.keys.add(event.key.toLowerCase());
      void unlockAudio();
    }
  }
}
function keyUp(event: KeyboardEvent) {
  input.keys.delete(event.key.toLowerCase());
}
function motion() {
  reduced.value = media?.matches ?? false;
}
function seek(time: number) {
  if (!debug) return;
  runtime.seek(time);
  snapshotAt = -1;
  audio.start(time);
  state.value = runtime.snapshot();
}
function forceFail() {
  if (debug) {
    runtime.player.shield = 0;
  }
}
function forceSpeed() {
  if (debug) {
    runtime.clock.setScale(Number(speed.value));
  }
}
watch(invincible, (value) => {
  if (debug) runtime.invincible = value;
});
onMounted(() => {
  media = window.matchMedia("(prefers-reduced-motion: reduce)");
  motion();
  media.addEventListener("change", motion);
  document.addEventListener("visibilitychange", visibility);
  window.addEventListener("keydown", keyDown);
  window.addEventListener("keyup", keyUp);
  host.value?.addEventListener("webglcontextlost", failRenderer, true);
  // A missing renderer must never leave the player on an indefinite loading screen.
  startupTimer = setTimeout(() => {
    if (!ready.value) failRenderer();
  }, 15000);
  void unlockAudio();
});
onBeforeUnmount(() => {
  disposed = true;
  clearTimeout(finishTimer);
  clearTimeout(startupTimer);
  media?.removeEventListener("change", motion);
  document.removeEventListener("visibilitychange", visibility);
  window.removeEventListener("keydown", keyDown);
  window.removeEventListener("keyup", keyUp);
  host.value?.removeEventListener("webglcontextlost", failRenderer, true);
  input.clear();
  runtime.dispose();
  audio.dispose();
});
</script>
<template>
  <section
    ref="host"
    class="star-dive"
    :class="{ 'dive-reduced': reduced }"
    :data-section="state.section"
    :data-quality="state.quality"
    :data-shield="state.shield"
    :data-gate-open="state.gateOpen"
    @pointerdown="pointerDown"
    @pointermove="pointerMove"
    @pointerup="pointerUp"
    @pointercancel="pointerUp"
  >
    <TresCanvas
      v-if="!error"
      :renderer="renderer"
      :dpr="1"
      :antialias="false"
      @error="failRenderer"
    >
      <StarDiveWorld
        :runtime="runtime"
        :reduced="reduced"
        :quality="quality"
        :collisions="debug && collisions"
        :before-step="beforeStep"
        @ready="start"
        @frame="frame"
        @error="failRenderer"
      />
    </TresCanvas>
    <StarDiveHud
      v-if="ready && !error"
      :state="state"
      :muted="muted"
      :inert="paused || error"
      :aria-hidden="paused || error"
      @pause="pause"
      @mute="mute"
    />
    <div class="dive-chapter" aria-hidden="true">
      <span>STAGE 01 · ASTEROID BELT</span><strong>{{ chapter }}</strong>
    </div>
    <div
      v-if="eventLabel"
      :key="state.event?.id"
      class="dive-event"
      role="status"
    >
      {{ eventLabel }}
    </div>
    <div v-if="state.time > 70 && state.time < 74" class="dive-burst-title">
      MIRAI BURST
    </div>
    <div
      v-if="
        !reduced &&
        state.event?.kind === 'damage' &&
        state.time - state.event.time < 0.18
      "
      class="dive-damage-flash"
    />
    <div
      v-if="demo && !touched && ready && state.time < 6"
      class="dive-gesture"
      aria-hidden="true"
    >
      ☝<i />
    </div>
    <div
      v-if="state.time < 2 && ready"
      class="dive-intro"
      :style="{ opacity: Math.max(0, 1 - state.time / 2) }"
    >
      <span>MIRAI: STAR DIVE</span>
    </div>
    <div
      class="dive-whiteout"
      :style="{ opacity: state.time > 78 ? (state.time - 78) / 2 : 0 }"
    />
    <div v-if="ready && state.shield === 0" class="dive-failure-flash">
      <span>✦</span>
    </div>
    <div
      v-if="error || !ready || paused"
      class="dive-overlay"
      @pointerdown.stop
      @pointermove.stop
    >
      <template v-if="error"
        ><h1><RubyText text="宇宙の準備ができませんでした。" /></h1>
        <button class="button" @click="$emit('leave')">
          <RubyText text="博物館にもどる" /></button
      ></template>
      <template v-else-if="!ready"
        ><span class="dive-loading">✦</span>
        <p><RubyText text="宇宙へ出発する準備中…" /></p
      ></template>
      <template v-else
        ><span class="eyebrow">MIRAI: STAR DIVE</span>
        <h1><RubyText text="ひとやすみ" /></h1>
        <LanguageSwitch /><button class="button primary" @click="resume">
          <RubyText text="冒険をつづける" /></button
        ><button class="button" @click="mute">
          <RubyText :text="muted ? '音を出す' : '音を消す'" /></button
        ><button class="button" @click="$emit('leave')">
          <RubyText text="博物館にもどる" /></button
      ></template>
    </div>
    <details
      v-if="debug && ready && !done"
      class="dive-debug"
      @pointerdown.stop
      @pointermove.stop
    >
      <summary>
        DEV · {{ fps }} FPS · {{ state.quality }} · {{ state.time.toFixed(1) }}s
      </summary>
      <div>
        <select
          aria-label="Debug section"
          @change="
            seek((Number(($event.target as HTMLSelectElement).value) * 80) / 6)
          "
        >
          <option v-for="(section, i) in sections" :key="section" :value="i">
            {{ section }}
          </option>
        </select>
        <select v-model="quality" aria-label="Debug quality">
          <option>high</option>
          <option>medium</option>
          <option>low</option>
        </select>
        <select v-model="speed" aria-label="Debug speed" @change="forceSpeed">
          <option>.5</option>
          <option>1</option>
          <option>2</option>
        </select>
        <label><input v-model="invincible" type="checkbox" />Invincible</label
        ><label><input v-model="collisions" type="checkbox" />Collision</label>
        <button @click="seek(79.3)">Debug clear</button
        ><button @click="forceFail">Debug fail</button
        ><span>WebGL2 · music clock {{ runtime.clock.bar }} / 48</span
        ><span v-if="audioClockAttached && !paused" class="dive-sync"
          >SYNC
          {{ Math.abs(audio.stageTime - runtime.clock.time).toFixed(3) }}s</span
        >
      </div>
    </details>
  </section>
</template>
