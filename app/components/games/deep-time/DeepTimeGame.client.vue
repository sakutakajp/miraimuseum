<script setup lang="ts">
import type { DinosaurRunScene } from "~/game/dinosaur/scenes/DinosaurRunScene";
import type {
  ClearResult,
  ControlRect,
  DeepTimeRecord,
  RunMode,
  UIAction,
} from "~/game/dinosaur/types";
import { gameCopy } from "~/game/dinosaur/copy";
import { takeDinosaurRuntime, discardDinosaurPreload } from "~/game/dinosaur/preload";
import {
  DEEP_TIME_SAVE_KEY,
  emptyRecord,
  parseRecord,
} from "~/game/dinosaur/systems/records";
const props = withDefaults(defineProps<{ autoStart?: boolean }>(), { autoStart: false });
const emit = defineEmits<{
  record: [value: DeepTimeRecord];
  cleared: [value: ClearResult];
  leave: [];
}>();
const { locale } = useLanguage();
const copy = computed(() => gameCopy(locale.value));
const host = ref<HTMLDivElement>();
const mode = ref<RunMode>("ready"),
  loaded = ref(false),
  fatal = ref(false),
  attempts = ref(0),
  best = ref(0),
  storageAvailable = ref(true);
const controls = shallowRef<ControlRect[]>([]);
const result = shallowRef<ClearResult>();
const debug = ref(false),
  debugText = ref("");
let scene: DinosaurRunScene | undefined;
let game: import("phaser").Game | undefined;
let observer: ResizeObserver | undefined;
let disposed = false;
const lifetime = new AbortController();
let debugTimer: ReturnType<typeof setInterval> | undefined;
const announce = computed(() =>
  fatal.value
    ? copy.value.failed
    : mode.value === "dead"
      ? copy.value.attemptBest(attempts.value, Math.floor(best.value * 100))
      : mode.value === "paused"
        ? copy.value.pausedTitle
        : mode.value === "complete"
          ? copy.value.result(result.value?.score ?? 0, Math.round((result.value?.sync ?? 0) * 100), result.value?.rank ?? "C")
          : "",
);
function label(c: ControlRect) {
  return {
    start: copy.value.start,
    pause: copy.value.pause,
    resume: copy.value.resume,
    mute: c.label,
    leave: copy.value.home,
    retry: copy.value.retry,
  }[c.action];
}
function action(value: UIAction) {
  scene?.act(value);
}
watch(locale, next => {
  if (scene) { scene.locale = next; scene.ui?.refresh(); }
});
function persist(record: DeepTimeRecord) {
  best.value = record.bestProgress;
  try {
    localStorage.setItem(DEEP_TIME_SAVE_KEY, JSON.stringify(record));
  } catch {
    storageAvailable.value = false;
  }
  emit("record", { ...record });
}
function error(value: unknown) {
  console.error("Dinosaur game initialization failed", value);
  fatal.value = true;
  scene?.pause();
  controls.value = [];
}
const lost = (event: Event) => {
  event.preventDefault();
  error(new Error("Graphics context lost"));
};
onMounted(async () => {
  let record = emptyRecord();
  try {
    record = parseRecord(localStorage.getItem(DEEP_TIME_SAVE_KEY));
  } catch {
    storageAvailable.value = false;
  }
  best.value = record.bestProgress;
  try {
    const { Phaser, DinosaurRunScene, DinosaurUIScene, playerModel } = await takeDinosaurRuntime(lifetime.signal);
    if (disposed || !host.value) return;
    const model = await playerModel.takePlayerModel(lifetime.signal);
    if (disposed || !host.value) { playerModel.disposePlayerModel(model); return; }
    scene = new DinosaurRunScene(
      {
        ready: () => {
          loaded.value = true;
          if (props.autoStart && !disposed) void scene?.start(true);
        },
        started: () => {
          attempts.value = scene!.attempts;
        },
        best: persist,
        paused: () => {},
        failed: () => {},
        cleared: (value) => {
          result.value = value;
          emit("cleared", value);
        },
        leave: () => emit("leave"),
        fatal: error,
        controls: (value) => {
          controls.value = value;
        },
        mode: (value) => {
          mode.value = value;
        },
      },
      record,
      matchMedia("(prefers-reduced-motion: reduce)").matches,
      locale.value,
      model,
    );
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("webgl2", { antialias: true, alpha: false, depth: true, stencil: true });
    game = new Phaser.Game({
      type: context ? Phaser.WEBGL : Phaser.CANVAS,
      canvas,
      // Phaser accepts WebGL contexts; its config type only lists Canvas2D.
      context: (context ?? undefined) as unknown as CanvasRenderingContext2D | undefined,
      parent: host.value,
      width: host.value.clientWidth,
      height: host.value.clientHeight,
      backgroundColor: "#10110f",
      pixelArt: false,
      roundPixels: false,
      antialias: true,
      scene: [scene, new DinosaurUIScene()],
      scale: { mode: Phaser.Scale.NONE },
      input: { activePointers: 1 },
      audio: { noAudio: true },
      fps: { smoothStep: false, target: 60 },
    });
    game.canvas.setAttribute("aria-hidden", "true");
    game.canvas.addEventListener("webglcontextlost", lost);
    observer = new ResizeObserver(() => {
      if (game && host.value?.clientWidth && host.value.clientHeight)
        game.scale.resize(host.value.clientWidth, host.value.clientHeight);
    });
    observer.observe(host.value);
    if (
      import.meta.dev &&
      new URLSearchParams(location.search).has("deepTimeDebug")
    ) {
      debug.value = true;
      scene.devEnabled = true;
      // Exposed solely in development: Playwright can drive real physics through the whole level.
      (window as unknown as { __deepTime?: DinosaurRunScene }).__deepTime =
        scene;
      debugTimer = setInterval(() => {
        if (!scene) return;
        const c = scene.runtime.world.clock,
          s = scene.runtime.world.state;
        debugText.value = `${scene.runtime.section.name} / BEAT ${c.beat.toFixed(2)} / BAR ${c.bar}\nTICK ${c.ticks} / Y ${s.playerY.toFixed(1)} / VY ${s.playerVelocityY.toFixed(1)}\nBUFFER ${(s.jumpBufferRemaining * 1000).toFixed(0)} / COYOTE ${(s.coyoteRemaining * 1000).toFixed(0)}\nFPS ${scene.game.loop.actualFps.toFixed(1)} / FRAME ${scene.game.loop.delta.toFixed(1)} ms\nCHUNKS ${scene.runtime.world.spatial.activeChunks} / ${scene.visual.quality.toUpperCase()}\nAUDIO Δ ${scene.audio.syncError.toFixed(3)} / SOURCES ${scene.audio.activeSources} / VFX ${scene.vfx?.activeCount ?? 0}\n${scene.runtime.triggers.log.slice(-2).join(" · ")}`;
      }, 200);
    }
  } catch (value) {
    if (!disposed) error(value);
  }
});
onBeforeUnmount(() => {
  disposed = true;
  lifetime.abort();
  discardDinosaurPreload();
  clearInterval(debugTimer);
  observer?.disconnect();
  game?.canvas.removeEventListener("webglcontextlost", lost);
  scene?.dispose();
  game?.destroy(true);
  if (import.meta.dev)
    delete (window as unknown as { __deepTime?: DinosaurRunScene }).__deepTime;
});
</script>
<template>
  <section
    class="deep-time-host"
    :data-mode="mode"
    :data-attempts="attempts"
    :data-best="best"
    :data-loaded="loaded"
    data-player-species="brachiosaurus"
    :aria-label="copy.gameAria"
  >
    <div ref="host" class="deep-time-canvas" />
    <div class="deep-time-accessibility" v-if="!fatal">
      <button
        v-for="c in controls"
        :key="c.action"
        :class="`deep-time-control deep-time-${c.action}`"
        :style="{
          left: c.x + 'px',
          top: c.y + 'px',
          width: c.width + 'px',
          height: c.height + 'px',
        }"
        :aria-label="label(c)"
        :disabled="c.action === 'start' && !loaded"
        @pointerdown.stop
        @click.stop="action(c.action)"
        @pointerenter="scene?.ui?.hover(c.action, true)"
        @pointerleave="scene?.ui?.hover(c.action, false)"
        @focus="scene?.ui?.hover(c.action, true)"
        @blur="scene?.ui?.hover(c.action, false)"
      >
        {{ label(c) }}
      </button>
    </div>
    <div v-if="!loaded || fatal" class="deep-time-loading" :class="{ fatal }">
      <p>{{ fatal ? copy.failed : copy.loading }}</p>
      <button
        v-if="fatal"
        :aria-label="copy.home"
        @click="emit('leave')"
      >
        {{ copy.home }} ↗
      </button>
    </div>
    <p class="deep-time-sr" role="status" aria-live="polite">{{ announce }}</p>
    <h1 v-if="mode === 'complete'" class="deep-time-sr">{{ copy.completeTitle }}</h1>
    <p v-if="!storageAvailable" class="deep-time-storage" role="status">
      {{ copy.noStorage }}
    </p>
    <aside v-if="debug" class="deep-time-debug">
      <pre>{{ debugText }}</pre>
      <button @click="scene!.hitboxes = !scene!.hitboxes">HITBOX</button
      ><button
        @click="
          scene!.runtime.world.previewInvincible =
            !scene!.runtime.world.previewInvincible
        "
      >
        PREVIEW</button
      ><button
        v-for="(section, i) in [
          'CALM',
          'HERD',
          'PREDATOR',
          'FLASH',
          'FALLOUT',
          'BOUNDARY',
        ]"
        :key="section"
        @click="scene!.debugSeek(i)"
      >
        {{ section }}</button
      ><button @click="scene!.visual.quality = 'low'">LOW</button>
    </aside>
  </section>
</template>
