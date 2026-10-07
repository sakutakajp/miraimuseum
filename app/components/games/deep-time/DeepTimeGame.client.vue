<script setup lang="ts">
import type { DinosaurRunScene } from "~/game/dinosaur/scenes/DinosaurRunScene";
import type {
  ClearResult,
  ControlRect,
  DeepTimeRecord,
  RunMode,
  UIAction,
} from "~/game/dinosaur/types";
import { EXHIBIT_PLATES } from "~/game/dinosaur/exhibit";
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
const host = ref<HTMLDivElement>();
const mode = ref<RunMode>("ready"),
  loaded = ref(false),
  fatal = ref(false),
  attempts = ref(0),
  best = ref(0),
  storageAvailable = ref(true);
const controls = shallowRef<ControlRect[]>([]);
const result = shallowRef<ClearResult>();
const showingExhibit = computed(
  () =>
    mode.value === "complete" &&
    controls.value.length > 0 &&
    !controls.value.some((c) => c.action === "exhibit"),
);
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
    ? locale.value === "ja"
      ? "読み込めませんでした"
      : "Unable to load"
    : mode.value === "dead"
      ? `ATTEMPT ${attempts.value} / BEST ${Math.floor(best.value * 100)}%`
      : mode.value === "paused"
        ? "PAUSED"
        : mode.value === "complete"
          ? `RUN COMPLETE. SCORE ${result.value?.score}. SYNC ${Math.round((result.value?.sync ?? 0) * 100)}%. RANK ${result.value?.rank}`
          : "",
);
function label(c: ControlRect) {
  const ja = locale.value === "ja";
  return {
    start: ja ? "スタート" : "Start",
    pause: ja ? "一時停止" : "Pause",
    resume: ja ? "続ける" : "Resume",
    mute: c.label,
    leave: ja ? "ホームへ戻る" : "Return home",
    retry: "Run again",
    exhibit: "Open exhibit",
  }[c.action];
}
function action(value: UIAction) {
  scene?.act(value);
}
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
  console.error("DEEP TIME initialization failed", value);
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
    const { Phaser, DinosaurRunScene, DinosaurUIScene } = await takeDinosaurRuntime(lifetime.signal);
    if (disposed || !host.value) return;
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
    );
    game = new Phaser.Game({
      type: Phaser.AUTO,
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
  scene?.audio.dispose();
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
    :aria-label="
      locale === 'ja'
        ? 'MIRAI: DEEP TIME。ブラキオサウルスを操作。タップ、クリック、Space、↑でジャンプ。Escapeで一時停止。'
        : 'MIRAI: DEEP TIME. Play as a Brachiosaurus. Tap, click, Space or Up to jump. Escape to pause.'
    "
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
      <span>DEEP TIME / 01</span>
      <h1>CRETACEOUS<br />LAST DAY</h1>
      <p>
        {{
          fatal
            ? locale === "ja"
              ? "読み込めませんでした"
              : "Unable to load the experience"
            : "Loading..."
        }}
      </p>
      <button
        v-if="fatal"
        :aria-label="locale === 'ja' ? 'ホームへ戻る' : 'Return home'"
        @click="emit('leave')"
      >
        {{ locale === "ja" ? "ホームへ戻る" : "Return home" }} ↗
      </button>
    </div>
    <p class="deep-time-sr" role="status" aria-live="polite">{{ announce }}</p>
    <article
      v-if="showingExhibit"
      class="deep-time-sr"
      aria-label="DEEP TIME exhibit"
    >
      <h2>66.0 Ma / K—Pg BOUNDARY</h2>
      <section v-for="plate in EXHIBIT_PLATES" :key="plate.heading">
        <h3>{{ plate.heading }}</h3>
        <p>
          {{
            (locale === "ja" ? plate.ja : plate.en).join(
              locale === "ja" ? "" : " ",
            )
          }}
        </p>
      </section>
    </article>
    <h1 v-if="mode === 'complete'" class="deep-time-sr">RUN COMPLETE</h1>
    <p v-if="!storageAvailable" class="deep-time-storage" role="status">
      {{
        locale === "ja"
          ? "この端末では記録を保存できません。"
          : "Records cannot be saved on this device."
      }}
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
