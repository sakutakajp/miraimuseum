<script setup lang="ts">
import { gameCopy } from "~/game/dinosaur/copy";
import { DEEP_TIME_SAVE_KEY, emptyRecord, parseRecord } from "~/game/dinosaur/systems/records";
import { readSettings, saveSettings, type Quality } from "~/three-d/settings";
import { discardDinosaurAudio } from "~/game/dinosaur/audio-context";
import type { RunWorld } from "~/games/dinosaur/RunWorld";
import type { ClearResult, DeepTimeRecord, RunMode } from "~/game/dinosaur/types";
const props = defineProps<{ autoStart?: boolean }>();
const emit = defineEmits<{ cleared: [value: ClearResult]; leave: [] }>();
const { locale } = useLanguage();
const copy = computed(() => gameCopy(locale.value));
const canvas = ref<HTMLCanvasElement>(), progress = ref<HTMLElement>();
const mode = ref<RunMode>("ready"), ready = ref(false), fatal = ref(false), storageFailed = ref(false), audioFailed = ref(false);
const record = ref(emptyRecord()), result = ref<ClearResult>(), failedProgress = ref(0);
const settings = ref({ volume: 0.8, muted: false, quality: "high" as Quality });
const overlay = computed(() => !ready.value || fatal.value || ["ready", "paused", "complete"].includes(mode.value));
watch([mode, ready, fatal], async () => {
  await nextTick();
  if (mode.value === "running" && !fatal.value) canvas.value?.focus({ preventScroll: true });
  const action = mode.value === "paused" ? "resume" : mode.value === "complete" ? "retry" : mode.value === "ready" && ready.value ? "start" : undefined;
  if (action) document.querySelector<HTMLButtonElement>(`.deep-time-host [data-testid="${action}"]`)?.focus({ preventScroll: true });
});
let world: RunWorld | undefined, loading: AbortController | undefined;
function store(value: DeepTimeRecord) {
  record.value = { ...value };
  try { localStorage.setItem(DEEP_TIME_SAVE_KEY, JSON.stringify(value)); } catch { storageFailed.value = true; }
}
function applySettings() {
  world?.audio.setMuted(settings.value.muted); world?.audio.setVolume(settings.value.volume); world?.setQuality(settings.value.quality);
  if (!saveSettings(settings.value)) storageFailed.value = true;
}
function mute() { settings.value.muted = !settings.value.muted; applySettings(); }
function leave() { emit("leave"); }
async function initialize() {
  loading?.abort(); world?.dispose(); world = undefined; ready.value = false; fatal.value = false;
  loading = new AbortController(); const signal = loading.signal;
  try {
    const { RunWorld } = await import("~/games/dinosaur/RunWorld");
    signal.throwIfAborted();
    const next = await RunWorld.create(canvas.value!, record.value, {
      ready: () => { if (!signal.aborted) ready.value = true; },
      mode: value => { if (!signal.aborted) mode.value = value; }, record: store,
      failed: value => failedProgress.value = value,
      cleared: value => { result.value = value; emit("cleared", value); },
      fatal: () => { if (!signal.aborted) fatal.value = true; },
      warning: value => { if (value === "audio" && !signal.aborted) audioFailed.value = true; },
    }, progress.value!, signal);
    if (signal.aborted) { next.dispose(); return; }
    world = next;
    if (import.meta.dev && new URLSearchParams(location.search).has("deepTimeDebug")) {
      const { runtimeResources } = await import("~/three-d/diagnostics");
      (window as any).__deepTime = { world, resources: runtimeResources,
        tick: (seconds: number) => { for (let remaining = seconds; remaining > 1e-8; remaining -= 0.05) world?.controller.tick(Math.min(remaining, 0.05)); },
        queueAuthoredJumps: () => { for (const challenge of world!.stage.rules.challenges) world!.controller.runtime.world.queueJump(challenge.at); },
      };
    }
    if (props.autoStart) await world.start(true);
  } catch { if (!signal.aborted) fatal.value = true; }
}
onMounted(() => {
  settings.value = readSettings();
  try { record.value = parseRecord(localStorage.getItem(DEEP_TIME_SAVE_KEY)); } catch { storageFailed.value = true; }
  void initialize();
});
onBeforeUnmount(() => { loading?.abort(); world?.dispose(); discardDinosaurAudio(); if (import.meta.dev) delete (window as any).__deepTime; });
</script>
<template>
  <main class="deep-time-host" data-engine="babylon" :data-mode="mode" :data-ready="ready">
    <canvas ref="canvas" class="run-canvas" tabindex="0" :inert="overlay" :aria-label="copy.gameAria" />
    <header class="run-header" :inert="overlay">
      <button type="button" @click="leave">{{ copy.home }}</button>
      <div class="run-record"><span>{{ copy.attempt(record.attempts) }}</span><span>BEST {{ Math.round(record.bestProgress * 100) }}%</span></div>
      <button type="button" data-testid="pause" :disabled="!ready || ['ready','complete'].includes(mode)" @click="world?.controller.pause()">{{ copy.pause }}</button>
    </header>
    <div class="run-progress" aria-hidden="true"><span ref="progress">0%</span></div>
    <p class="run-hint" v-if="mode === 'running'">{{ copy.jumpHint }}</p>
    <div v-if="!ready || fatal" class="run-overlay" role="status">
      <p class="run-overline">DEEP TIME / 01</p><h1>CRETACEOUS<br />LAST DAY</h1>
      <p>{{ fatal ? copy.failed : copy.loading }}</p>
      <button v-if="!fatal" @click="leave">{{ copy.home }}</button>
      <div class="run-buttons" v-if="fatal"><button @click="initialize">{{ locale === 'ja' ? '再読み込み' : 'Reload' }}</button><button @click="leave">{{ copy.home }}</button></div>
    </div>
    <div v-else-if="mode === 'ready'" class="run-overlay">
      <p class="run-overline">DEEP TIME / 01</p><h1>CRETACEOUS<br />LAST DAY</h1><p>{{ copy.metadata }}</p>
      <button data-testid="start" @click="world?.start()">{{ copy.start }}</button>
    </div>
    <div v-else-if="mode === 'paused'" class="run-overlay" role="dialog" aria-modal="true" :aria-label="copy.pausedTitle">
      <p class="run-overline">{{ copy.pauseCaption }}</p><h1>{{ copy.pausedTitle }}</h1>
      <div class="run-buttons"><button data-testid="resume" @click="world?.resume()">{{ copy.resume }}</button><button @click="world?.controller.retry()">{{ copy.retry }}</button><button @click="leave">{{ copy.home }}</button></div>
      <div class="run-settings">
        <button @click="mute">{{ settings.muted ? copy.soundOff : copy.soundOn }}</button>
        <label>{{ locale === 'ja' ? '音量' : 'Volume' }}<input type="range" :aria-label="locale === 'ja' ? '音量' : 'Volume'" min="0" max="1" step="0.05" v-model.number="settings.volume" @input="applySettings" /></label>
        <label>{{ locale === 'ja' ? '画質' : 'Quality' }}<select :aria-label="locale === 'ja' ? '画質' : 'Quality'" v-model="settings.quality" @change="applySettings"><option value="high">{{ locale === 'ja' ? '高画質' : 'High' }}</option><option value="medium">{{ locale === 'ja' ? '標準' : 'Medium' }}</option><option value="low">{{ locale === 'ja' ? '軽量' : 'Low' }}</option></select></label>
      </div>
    </div>
    <div v-else-if="mode === 'complete' && result" class="run-overlay" role="dialog" aria-modal="true" :aria-label="copy.completeTitle">
      <p class="run-overline">{{ copy.scoreRank(result.rank) }}</p><h1>{{ result.score.toLocaleString() }}</h1><p>{{ copy.completeTitle }} · SYNC {{ Math.round(result.sync * 100) }}%</p>
      <div class="run-buttons"><button data-testid="retry" @click="world?.controller.retry()">{{ copy.retry }}</button><button @click="leave">{{ copy.home }}</button></div>
    </div>
    <p v-if="mode === 'dead'" class="run-death" role="status">{{ Math.round(failedProgress * 100) }}%</p>
    <p class="deep-time-sr" role="status" aria-live="polite">{{ mode === 'complete' && result ? copy.result(result.score, Math.round(result.sync * 100), result.rank) : mode === 'paused' ? copy.pausedTitle : '' }}</p>
    <p v-if="storageFailed || audioFailed" class="run-warning">{{ storageFailed ? copy.noStorage : locale === 'ja' ? '音声を読み込めませんでした。音声なしで続けられます。' : 'Audio could not be loaded. You can continue silently.' }}</p>
  </main>
</template>
