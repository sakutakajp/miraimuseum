<script setup lang="ts">
import { DeliveryRuntime } from "~/game/space-delivery/runtime";
import { DeliveryAudio } from "~/game/space-delivery/audio";
import { stages } from "~/game/space-delivery/stages";
import { copy, textFor } from "~/game/space-delivery/copy";
import {
  adjustShot,
  clampDrag,
  dragFromShot,
  shotFromDrag,
} from "~/game/space-delivery/input";
import {
  emptyProgress,
  parseProgress,
  recordDelivery,
  SAVE_KEY,
} from "~/game/space-delivery/progress";
import type { Mode, Shot } from "~/game/space-delivery/types";
const root = ref<HTMLElement>(),
  host = ref<HTMLDivElement>(),
  pad = ref<HTMLDivElement>(),
  menu = ref<HTMLDialogElement>();
const mode = ref<Mode>("ready"),
  stageIndex = ref(0),
  loaded = ref(false),
  fatal = ref(false);
const shot = ref<Shot>({ angle: 0, speed: 85 }),
  failures = ref(0),
  collected = ref(0),
  assist = ref(false),
  storageOK = ref(true),
  hintOpen = ref(false),
  discovered = ref(false);
const progress = ref(emptyProgress());
const stage = computed(() => stages[stageIndex.value]!);
const drag = ref({ x: 0, y: 0 }),
  pointerActive = ref(false),
  tutorial = ref(false);
const announcement = computed(
  () =>
    `${textFor(stage.value.nameKey)}。${mode.value === "success" ? copy.success + " " + (1 + collected.value) + "つ星" : mode.value === "failure" ? copy.failure : mode.value === "paused" ? copy.paused : mode.value === "flying" ? copy.flying : copy.intro}`,
);
const canAim = computed(
  () => loaded.value && ["ready", "aiming"].includes(mode.value),
);
const audio = new DeliveryAudio();
const museumMusic = useMuseumMusic();
let releaseMuseumMusic: (() => void) | undefined;
let runtime: DeliveryRuntime;
let game:
    import("~/game/space-delivery/DeliveryScene").DeliveryScene | undefined,
  disposed = false;
let pointerId: number | undefined,
  pointerStart = { x: 0, y: 0 },
  shotBeforeDrag: Shot | undefined;
const lifetime = new AbortController();
function persist() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(progress.value));
  } catch {
    storageOK.value = false;
  }
}
function sync() {
  mode.value = runtime.mode;
  shot.value = { ...runtime.shot };
  failures.value = runtime.failures;
  collected.value = runtime.flight.collected.length;
  assist.value = runtime.assist;
  if (!pointerActive.value)
    drag.value = dragFromShot(runtime.shot, runtime.stage.maxSpeed);
}
function event(kind: "launch" | "star" | "success" | "failure") {
  audio.play(kind);
  if (kind === "success") {
    progress.value = recordDelivery(
      progress.value,
      stage.value.id,
      runtime.flight.collected.length,
    );
    persist();
  }
}
function unlock() {
  void audio.unlock();
}
function cancelDrag() {
  const capturedPointer = pointerId;
  pointerId = undefined;
  if (
    capturedPointer !== undefined &&
    pad.value?.hasPointerCapture(capturedPointer)
  )
    pad.value.releasePointerCapture(capturedPointer);
  pointerActive.value = false;
  if (runtime) {
    runtime.cancel();
    if (shotBeforeDrag) runtime.setShot(shotBeforeDrag);
    drag.value = dragFromShot(runtime.shot, runtime.stage.maxSpeed);
  }
  shotBeforeDrag = undefined;
}
function cancelPointer(e: PointerEvent) {
  if (e.pointerId === pointerId) cancelDrag();
}
function down(e: PointerEvent) {
  if (
    !canAim.value ||
    pointerId !== undefined ||
    e.button !== 0 ||
    !e.isPrimary
  )
    return;
  const rect = pad.value!.getBoundingClientRect(),
    cx = rect.left + rect.width / 2,
    cy = rect.top + rect.height / 2;
  // Catch only the central handle, leaving enough margin for every launch direction.
  if (Math.hypot(e.clientX - cx, e.clientY - cy) > 30) return;
  root.value?.focus({ preventScroll: true });
  unlock();
  pointerId = e.pointerId;
  pointerStart = { x: cx, y: cy };
  shotBeforeDrag = { ...runtime.shot };
  pad.value!.setPointerCapture(e.pointerId);
  pointerActive.value = true;
  drag.value = { x: 0, y: 0 };
  runtime.aim();
  tutorial.value = false;
  progress.value.tutorialSeen = true;
  persist();
  e.preventDefault();
}
function move(e: PointerEvent) {
  if (e.pointerId !== pointerId) return;
  drag.value = clampDrag({
    x: e.clientX - pointerStart.x,
    y: e.clientY - pointerStart.y,
  });
  const next = shotFromDrag(drag.value, stage.value.maxSpeed);
  if (next) runtime.setShot(next);
  audio.play("stretch");
}
function up(e: PointerEvent) {
  if (e.pointerId !== pointerId) return;
  move(e);
  const next = shotFromDrag(drag.value, stage.value.maxSpeed);
  if (next) {
    pointerId = undefined;
    pointerActive.value = false;
    shotBeforeDrag = undefined;
    if (pad.value?.hasPointerCapture(e.pointerId))
      pad.value.releasePointerCapture(e.pointerId);
    runtime.setShot(next);
    runtime.fire();
  } else cancelDrag();
}
function retry() {
  cancelDrag();
  hintOpen.value = false;
  discovered.value = false;
  runtime.retry();
}
function fire() {
  if (!canAim.value) return;
  unlock();
  tutorial.value = false;
  progress.value.tutorialSeen = true;
  persist();
  runtime.fire();
}
function adjust(angle: number, speed: number) {
  if (canAim.value) {
    unlock();
    runtime.setShot(
      adjustShot(runtime.shot, angle, speed, stage.value.maxSpeed),
    );
  }
}
function pause() {
  cancelDrag();
  runtime?.pause();
  audio.silence();
}
function resume() {
  if (document.hidden) return;
  unlock();
  runtime.resume();
}
function toggleSound() {
  unlock();
  progress.value.muted = !progress.value.muted;
  audio.setMuted(progress.value.muted);
  persist();
}
function select(index: number) {
  if (index >= progress.value.unlocked) return;
  cancelDrag();
  stageIndex.value = index;
  hintOpen.value = false;
  discovered.value = false;
  runtime.select(stage.value);
  menu.value?.close();
  root.value?.focus();
}
function openMenu() {
  pause();
  menu.value?.showModal();
}
function closeMenu() {
  menu.value?.close();
  root.value?.focus();
}
function key(e: KeyboardEvent) {
  if (e.target !== root.value || e.ctrlKey || e.altKey || e.metaKey) return;
  const handlers: Record<string, () => void> = {
    ArrowLeft: () => adjust(-2, 0),
    ArrowRight: () => adjust(2, 0),
    ArrowUp: () => adjust(0, 3),
    ArrowDown: () => adjust(0, -3),
    " ": fire,
    r: retry,
    R: retry,
    Escape: pause,
  };
  if (handlers[e.key]) {
    e.preventDefault();
    handlers[e.key]!();
  }
}
onMounted(async () => {
  releaseMuseumMusic = museumMusic.holdForGame();
  try {
    progress.value = parseProgress(localStorage.getItem(SAVE_KEY));
  } catch {
    storageOK.value = false;
  }
  tutorial.value = !progress.value.tutorialSeen;
  audio.setMuted(progress.value.muted);
  runtime = new DeliveryRuntime(stage.value, sync, event);
  sync();
  document.addEventListener(
    "visibilitychange",
    () => {
      if (document.hidden) pause();
    },
    { signal: lifetime.signal },
  );
  window.addEventListener("blur", pause, { signal: lifetime.signal });
  window.addEventListener(
    "orientationchange",
    () => {
      cancelDrag();
      pause();
    },
    { signal: lifetime.signal },
  );
  window.addEventListener(
    "resize",
    () => {
      if (pointerActive.value) cancelDrag();
    },
    { signal: lifetime.signal },
  );
  try {
    const { DeliveryScene } =
      await import("~/game/space-delivery/DeliveryScene");
    if (disposed || !host.value) return;
    game = new DeliveryScene(
      host.value,
      runtime,
      matchMedia("(prefers-reduced-motion: reduce)").matches,
      () => {
        loaded.value = true;
      },
    );
    root.value?.focus({ preventScroll: true });
  } catch {
    fatal.value = true;
  }
});
onBeforeUnmount(() => {
  disposed = true;
  cancelDrag();
  lifetime.abort();
  audio.dispose();
  releaseMuseumMusic?.();
  game?.dispose();
});
</script>
<template>
  <main
    ref="root"
    lang="ja"
    class="delivery"
    tabindex="0"
    :aria-label="copy.title"
    :data-mode="mode"
    :data-stage="stage.id"
    :data-loaded="loaded"
    @keydown="key"
  >
    <header class="delivery-header">
      <NuxtLink to="/" class="delivery-back" :aria-label="copy.back"
        >← <span>MUSEUM</span></NuxtLink
      >
      <button
        class="delivery-stage-button"
        @click="openMenu"
        :disabled="!loaded"
        :aria-label="copy.stages"
      >
        {{ String(stage.id).padStart(2, "0") }} <span>/ 06</span> ▦
      </button>
      <span
        class="delivery-best"
        :aria-label="`${progress.best[stageIndex]} / 3`"
        >{{ "★".repeat(progress.best[stageIndex]!)
        }}<span>{{ "☆".repeat(3 - progress.best[stageIndex]!) }}</span></span
      >
      <button
        class="delivery-sound"
        @click="toggleSound"
        :aria-label="progress.muted ? copy.soundOff : copy.soundOn"
        :aria-pressed="!progress.muted"
      >
        {{ progress.muted ? "♪ ×" : "♪" }}
      </button>
    </header>
    <section class="delivery-game-area">
      <div class="delivery-heading">
        <p>
          {{ copy.subtitle }}
          <span>· {{ String(stage.id).padStart(2, "0") }}</span>
        </p>
        <h1>{{ copy.title }}</h1>
        <h2>{{ textFor(stage.nameKey) }}</h2>
        <p class="delivery-parcel">▣ {{ textFor(stage.parcelKey) }}</p>
      </div>
      <div class="delivery-board-wrap">
        <div
          ref="host"
          class="delivery-board"
          :aria-label="`${copy.title}：${textFor(stage.nameKey)}`"
          role="img"
        />
        <div v-if="!loaded" class="delivery-overlay">
          <p>{{ fatal ? copy.fatal : copy.loading }}</p>
        </div>
        <div
          v-else-if="mode === 'success'"
          class="delivery-overlay delivery-result"
          role="group"
          :aria-label="copy.success"
        >
          <p class="delivery-result-stars">
            {{ "★".repeat(1 + collected)
            }}<span>{{ "☆".repeat(2 - collected) }}</span>
          </p>
          <h2>{{ stage.id === 6 ? copy.finale : copy.success }}</h2>
          <p
            v-if="stage.id === 6"
            class="delivery-finale-cats"
            aria-hidden="true"
          >
            <svg v-for="i in 6" :key="i" viewBox="0 0 32 32">
              <path
                d="M4 16L3 3l10 7h6l10-7-1 13a12 12 0 1 1-24 0"
                :fill="['#ffe3c6', '#bedade', '#e9c598'][i % 3]"
              />
              <path
                d="M8 16q3-4 5 0m6 0q3-4 5 0"
                fill="none"
                stroke="#26344b"
                stroke-width="1.5"
              />
              <path d="M14 20h4l-2 3z" fill="#d48692" />
            </svg>
          </p>
          <p>
            {{ stage.id === 6 ? copy.finaleSub : textFor(stage.parcelKey) }}
          </p>
          <button
            v-if="stage.id < 6"
            class="delivery-primary"
            @click="select(stageIndex + 1)"
          >
            {{ copy.next }} →
          </button>
          <button v-else class="delivery-primary" @click="openMenu">
            {{ copy.stages }}
          </button>
          <button class="delivery-discovery" @click="discovered = !discovered">
            {{ copy.discovery }} {{ discovered ? "−" : "＋" }}
          </button>
          <p v-if="discovered" class="delivery-found">
            {{ textFor(`found${stage.id}`) }}
          </p>
        </div>
        <div
          v-else-if="mode === 'failure'"
          class="delivery-overlay delivery-failure"
        >
          <h2>{{ copy.failure }}</h2>
          <button class="delivery-primary" @click="retry">
            ↻ {{ copy.retry }}
          </button>
        </div>
        <div
          v-else-if="mode === 'paused'"
          class="delivery-overlay delivery-result"
        >
          <h2>{{ copy.paused }}</h2>
          <button class="delivery-primary" @click="resume">
            ▶ {{ copy.resume }}
          </button>
        </div>
        <div class="delivery-board-caption" aria-hidden="true">
          <span>◌ DELIVERY</span><span>✦ {{ collected }} / 2</span>
        </div>
      </div>
    </section>
    <aside class="delivery-controls">
      <p class="delivery-control-heading">
        {{ mode === "flying" ? copy.flying : copy.instruction }}
      </p>
      <div
        ref="pad"
        class="delivery-pad"
        :class="{ 'is-active': pointerActive, 'is-disabled': !canAim }"
        @pointerdown="down"
        @pointermove="move"
        @pointerup="up"
        @pointercancel="cancelPointer"
        @lostpointercapture="cancelPointer"
        :aria-label="copy.reverse"
      >
        <svg viewBox="0 0 200 160" aria-hidden="true">
          <circle cx="100" cy="80" r="58" class="delivery-pad-ring" />
          <g v-for="i in 24" :key="i" :transform="`rotate(${i * 15} 100 80)`">
            <line
              x1="100"
              y1="15"
              x2="100"
              y2="20"
              :class="
                i <= Math.round((shot.speed / stage.maxSpeed) * 24)
                  ? 'delivery-tick-on'
                  : 'delivery-tick'
              "
            />
          </g>
          <line
            x1="100"
            y1="80"
            :x2="100 + drag.x"
            :y2="80 + drag.y"
            class="delivery-elastic"
          />
          <circle cx="100" cy="80" r="24" class="delivery-pad-center" />
          <circle
            v-if="pointerActive"
            :cx="100 + drag.x"
            :cy="80 + drag.y"
            r="20"
            class="delivery-handle"
          />
        </svg>
        <span class="delivery-pad-label" aria-hidden="true"
          >{{ copy.pad }}<b>↓</b></span
        >
        <span v-if="tutorial && canAim" class="delivery-hand" aria-hidden="true"
          >☝</span
        >
      </div>
      <p class="delivery-hint">
        {{ hintOpen ? textFor(stage.hintKey) : copy.reverse }}
      </p>
      <div class="delivery-adjustments">
        <div>
          <span
            >{{ copy.angle }} <b>{{ Math.round(shot.angle) }}°</b></span
          ><button
            @click="adjust(-2, 0)"
            :disabled="!canAim"
            :aria-label="copy.left"
          >
            ↶</button
          ><button
            @click="adjust(2, 0)"
            :disabled="!canAim"
            :aria-label="copy.right"
          >
            ↷
          </button>
        </div>
        <div>
          <span
            >{{ copy.power }}
            <b>{{ Math.round((shot.speed / stage.maxSpeed) * 100) }}%</b></span
          ><button
            @click="adjust(0, -3)"
            :disabled="!canAim"
            :aria-label="copy.weaker"
          >
            −</button
          ><button
            @click="adjust(0, 3)"
            :disabled="!canAim"
            :aria-label="copy.stronger"
          >
            ＋
          </button>
        </div>
        <button class="delivery-fire" @click="fire" :disabled="!canAim">
          {{ copy.launch }} ↗
        </button>
      </div>
      <div class="delivery-actions">
        <button class="delivery-retry" @click="retry" :disabled="!loaded">
          ↻ {{ copy.retry }}</button
        ><button
          @click="mode === 'paused' ? resume() : pause()"
          :disabled="!loaded"
          :aria-label="mode === 'paused' ? copy.resume : copy.pause"
        >
          {{ mode === "paused" ? "▶" : "Ⅱ" }}</button
        ><button v-if="failures >= 3" @click="hintOpen = !hintOpen">
          {{ copy.hint }}
        </button>
      </div>
      <button
        v-if="hintOpen || assist"
        class="delivery-assist"
        :aria-pressed="assist"
        @click="runtime.help()"
      >
        {{ assist ? "✓ " + copy.assistOn : "＋ " + copy.assist }}
      </button>
      <p class="delivery-keyboard">{{ copy.keyboard }}</p>
      <p v-if="!storageOK" class="delivery-storage" role="status">
        {{ copy.storage }}
      </p>
    </aside>
    <p class="delivery-sr" role="status" aria-live="polite">
      {{ announcement }}
    </p>
    <dialog
      ref="menu"
      class="delivery-menu"
      :aria-label="copy.stages"
      @click.self="closeMenu"
      @cancel="closeMenu"
    >
      <div class="delivery-menu-heading">
        <h2>{{ copy.stages }}</h2>
        <button @click="closeMenu" :aria-label="copy.close">×</button>
      </div>
      <button
        v-for="(s, index) in stages"
        :key="s.id"
        class="delivery-menu-stage"
        :disabled="s.id > progress.unlocked"
        @click="select(index)"
      >
        <b>{{ String(s.id).padStart(2, "0") }}</b
        ><span
          >{{ textFor(s.nameKey)
          }}<small>{{
            s.id > progress.unlocked
              ? copy.locked
              : "★".repeat(progress.best[index]!) +
                "☆".repeat(3 - progress.best[index]!)
          }}</small></span
        ><i>{{ s.id > progress.unlocked ? "⌑" : "→" }}</i>
      </button>
      <p>{{ copy.science }}</p>
    </dialog>
  </main>
</template>
<style scoped>
:where(.delivery) :where(p, h1, h2) {
  margin: 0;
}
:where(.delivery) :where(button) {
  border: 0;
  background: none;
}
.delivery {
  height: 100dvh;
  min-height: 0;
  display: grid;
  grid-template-rows: 58px minmax(0, 1fr) auto;
  grid-template-columns: minmax(0, 1fr);
  background: #0c1427;
  color: #f1f3f9;
  padding: env(safe-area-inset-top) max(12px, env(safe-area-inset-right))
    max(8px, env(safe-area-inset-bottom)) max(12px, env(safe-area-inset-left));
  overflow: hidden;
  font-family: "Helvetica Neue", "Hiragino Kaku Gothic ProN", sans-serif;
  outline: none;
  isolation: isolate;
}
.delivery button,
.delivery a {
  min-width: 44px;
  min-height: 44px;
  border-radius: 12px;
  color: inherit;
  text-decoration: none;
  touch-action: manipulation;
  font-size: 12px;
}
.delivery button:focus-visible,
.delivery a:focus-visible {
  outline: 2px solid #b1f8e0;
  outline-offset: 3px;
}
.delivery-header {
  display: flex;
  gap: 10px;
  align-items: center;
  width: 100%;
  max-width: 1060px;
  margin: auto;
  border-bottom: 1px solid #ffffff10;
}
.delivery-back {
  display: flex;
  align-items: center;
  gap: 9px;
  font-size: 20px !important;
}
.delivery-back span {
  font: 9px monospace;
  letter-spacing: 0.12em;
  color: #9baec4;
}
.delivery-stage-button {
  margin-left: auto;
  font: 13px monospace !important;
}
.delivery-stage-button span {
  color: #8391aa;
}
.delivery-best {
  color: #ffd66d;
  letter-spacing: 2px;
  font-size: 15px;
  white-space: nowrap;
}
.delivery-best span {
  color: #63718a;
}
.delivery-sound {
  border: 1px solid #ffffff18;
  font-size: 20px !important;
}
.delivery-game-area {
  min-height: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 12px;
  gap: 8px;
}
.delivery-heading {
  text-align: center;
  flex-shrink: 0;
}
.delivery-heading > p:first-child {
  font: 9px monospace;
  letter-spacing: 0.17em;
  color: #8ce5cb;
  margin-bottom: 7px;
}
.delivery-heading > p:first-child span {
  color: #8293b2;
}
.delivery-heading h1 {
  font-size: clamp(19px, 3vw, 27px);
  letter-spacing: 0.07em;
}
.delivery-heading h2 {
  font-size: 12px;
  font-weight: 500;
  color: #b2bdd4;
  margin-top: 5px;
}
.delivery-parcel {
  font-size: 10px;
  color: #8d9db9;
  margin-top: 7px;
}
.delivery-board-wrap {
  position: relative;
  width: 100%;
  max-width: 500px;
  flex: 1;
  min-height: 0;
  overflow: hidden;
  border-radius: 20px;
  background: #0c142c;
  border: 1px solid #ffffff0d;
}
.delivery-board {
  width: 100%;
  height: 100%;
  overflow: hidden;
}
.delivery-board :deep(canvas) {
  display: block;
}
.delivery-board-caption {
  position: absolute;
  bottom: 8px;
  left: 12px;
  right: 12px;
  display: flex;
  justify-content: space-between;
  pointer-events: none;
  font: 8px monospace;
  letter-spacing: 0.12em;
  color: #91b3b5;
}
.delivery-board-caption span:last-child {
  color: #ffda83;
}
.delivery-overlay {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  width: min(290px, 90%);
  padding: 20px 14px;
  border: 1px solid #9dedda40;
  border-radius: 20px;
  background: #121f38ee;
  text-align: center;
  font-size: 12px;
  box-shadow: 0 12px 60px #040b2080;
  backdrop-filter: blur(8px);
}
.delivery-result h2 {
  font-size: 23px;
  margin-bottom: 8px;
}
.delivery-result > p {
  color: #b9cbe0;
  font-size: 11px;
}
.delivery-result-stars {
  font-size: 27px !important;
  letter-spacing: 6px;
  color: #ffda7c !important;
  margin-bottom: 4px;
}
.delivery-result-stars span {
  color: #586b89;
}
.delivery-primary {
  background: #a1f0d7;
  color: #142d35 !important;
  min-height: 44px;
  margin-top: 14px;
  padding: 10px 22px;
  font-weight: bold;
  box-shadow: 0 4px 20px #81eecb12;
}
.delivery-discovery {
  display: block;
  margin: 8px auto 0;
  color: #a4b7d1 !important;
  font-size: 10px !important;
}
.delivery-found {
  line-height: 1.8;
}
.delivery-failure {
  top: 38%;
  padding: 12px;
}
.delivery-failure h2 {
  font-size: 16px;
}
.delivery-finale-cats {
  display: flex;
  justify-content: center;
  gap: 5px;
  margin: 10px 0;
}
.delivery-finale-cats svg {
  width: 28px;
  height: 28px;
}
.delivery-controls {
  width: min(100%, 500px);
  justify-self: center;
  text-align: center;
  padding-top: 10px;
}
.delivery-control-heading {
  font-size: 12px;
  color: #e3e9f5;
  letter-spacing: 0.08em;
}
.delivery-pad {
  position: relative;
  width: 200px;
  height: 160px;
  margin: -1px auto -3px;
  touch-action: none;
  user-select: none;
  cursor: grab;
}
.delivery-pad:active {
  cursor: grabbing;
}
.delivery-pad svg {
  width: 100%;
  height: 100%;
  overflow: visible;
}
.delivery-pad-ring {
  stroke: #8bafc63b;
  stroke-width: 1;
  fill: #18263f;
}
.delivery-pad-center {
  fill: #314463;
  stroke: #a8c4da;
  stroke-width: 1.3;
}
.delivery-tick {
  stroke: #ffffff20;
  stroke-width: 2;
}
.delivery-tick-on {
  stroke: #efd08d;
  stroke-width: 2;
}
.delivery-elastic {
  stroke: #b8ead7;
  stroke-width: 4;
  stroke-linecap: round;
}
.delivery-handle {
  fill: #98e8cc;
  stroke: #d8fff0;
  stroke-width: 2;
}
.delivery-pad-label {
  position: absolute;
  top: 62px;
  left: 0;
  right: 0;
  font-size: 9px;
  line-height: 1.4;
  pointer-events: none;
  color: #e5eefb;
}
.delivery-pad-label b {
  display: block;
  font-size: 15px;
}
.is-active .delivery-pad-label {
  opacity: 0;
}
.is-disabled {
  opacity: 0.45;
  cursor: default;
}
.delivery-hand {
  position: absolute;
  top: 65px;
  left: 96px;
  font-size: 32px;
  color: #ffe2b5;
  pointer-events: none;
  animation: delivery-pull 2.1s ease-in-out infinite;
  filter: drop-shadow(0 3px 2px #0008);
}
@keyframes delivery-pull {
  0%,
  15% {
    transform: translateY(0);
    opacity: 0;
  }
  25% {
    opacity: 1;
  }
  70% {
    transform: translateY(42px);
    opacity: 1;
  }
  90%,
  100% {
    transform: translateY(42px);
    opacity: 0;
  }
}
.delivery-hint {
  font-size: 10px;
  line-height: 1.6;
  color: #96aac6;
  min-height: 16px;
  margin: 0 auto 6px;
  max-width: 330px;
}
.delivery-adjustments {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
}
.delivery-adjustments > div {
  display: flex;
  align-items: center;
  background: #ffffff05;
  border: 1px solid #ffffff0d;
  border-radius: 12px;
}
.delivery-adjustments > div > span {
  display: block;
  font-size: 9px;
  padding-left: 9px;
  min-width: 47px;
  color: #96aac6;
  text-align: left;
}
.delivery-adjustments b {
  display: block;
  font: 11px monospace;
  color: #e3ecf8;
  margin-top: 3px;
}
.delivery-adjustments button {
  font-size: 19px;
  min-width: 44px;
  padding: 0;
}
.delivery-fire {
  padding: 0 10px;
  background: #b3efdc;
  color: #1a3340 !important;
  font-size: 11px !important;
}
.delivery button:disabled {
  opacity: 0.35;
}
.delivery-actions {
  display: flex;
  justify-content: center;
  gap: 5px;
  margin-top: 7px;
}
.delivery-actions button {
  border: 1px solid #ffffff14;
  padding: 0 12px;
}
.delivery-retry {
  min-width: 158px !important;
  background: #ffffff07;
}
.delivery-assist {
  min-height: 44px !important;
  font-size: 10px !important;
  color: #b6f2db !important;
  padding: 0 12px;
}
.delivery-keyboard {
  font: 8px monospace;
  color: #637692;
  margin: 8px 0 3px;
}
.delivery-storage {
  font-size: 9px;
  color: #ffd19e;
}
.delivery-sr {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}
.delivery-menu {
  width: min(380px, calc(100vw - 30px));
  max-height: calc(100dvh - 30px);
  overflow: auto;
  padding: 20px;
  border: 1px solid #a9dddf33;
  border-radius: 20px;
  background: #111e35;
  color: #f1f4fa;
}
.delivery-menu::backdrop {
  background: #060d1dbb;
  backdrop-filter: blur(5px);
}
.delivery-menu-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}
.delivery-menu-heading h2 {
  font-size: 18px;
}
.delivery-menu-heading button {
  font-size: 24px;
}
.delivery-menu-stage {
  display: flex;
  align-items: center;
  text-align: left;
  width: 100%;
  gap: 14px;
  min-height: 64px !important;
  padding: 12px;
  margin: 6px 0;
  border: 1px solid #ffffff14 !important;
  background: #ffffff03;
}
.delivery-menu-stage b {
  font: 18px monospace;
  color: #a1e9d2;
}
.delivery-menu-stage small {
  display: block;
  color: #f0cf86;
  font-size: 10px;
  margin-top: 5px;
  letter-spacing: 3px;
}
.delivery-menu-stage i {
  margin-left: auto;
  font-style: normal;
}
.delivery-menu > p {
  font-size: 10px;
  line-height: 1.8;
  color: #96abc6;
  margin-top: 16px;
}
@media (min-width: 800px), (orientation: landscape) {
  .delivery {
    grid-template-rows: 58px minmax(0, 1fr);
    grid-template-columns: minmax(0, 1fr) 310px;
    column-gap: 30px;
    padding-left: max(24px, env(safe-area-inset-left));
    padding-right: max(24px, env(safe-area-inset-right));
    padding-bottom: 16px;
  }
  .delivery-header {
    grid-column: 1/-1;
  }
  .delivery-game-area {
    justify-self: end;
    width: min(100%, 550px);
    padding-top: 16px;
    padding-bottom: 0;
  }
  .delivery-controls {
    align-self: center;
    justify-self: start;
    width: 310px;
    padding: 12px 0;
  }
  .delivery-heading h1 {
    font-size: 24px;
  }
  .delivery-board-wrap {
    max-width: 500px;
  }
  .delivery-pad {
    margin: 10px auto;
  }
  .delivery-controls > .delivery-hint {
    margin-bottom: 12px;
  }
  .delivery-controls > .delivery-keyboard {
    margin-top: 16px;
  }
}
@media (max-height: 740px) and (orientation: portrait) {
  .delivery {
    grid-template-rows: 48px minmax(0, 1fr) auto;
    padding-bottom: 4px;
  }
  .delivery-game-area {
    padding-top: 6px;
    gap: 5px;
  }
  .delivery-heading > p:first-child {
    display: none;
  }
  .delivery-heading h1 {
    font-size: 18px;
  }
  .delivery-heading h2 {
    font-size: 10px;
    margin-top: 2px;
  }
  .delivery-parcel {
    font-size: 9px;
    margin-top: 3px;
  }
  .delivery-controls {
    padding-top: 5px;
  }
  .delivery-pad {
    height: 140px;
    width: 175px;
    margin: -3px auto -5px;
  }
  .delivery-control-heading {
    font-size: 10px;
  }
  .delivery-pad-label {
    top: 53px;
  }
  .delivery-hand {
    top: 55px;
    left: 82px;
  }
  .delivery-hint {
    font-size: 9px;
    margin-bottom: 3px;
  }
  .delivery-keyboard {
    display: none;
  }
  .delivery-actions {
    margin-top: 4px;
  }
  .delivery-overlay {
    padding: 12px;
  }
  .delivery-result h2 {
    font-size: 18px;
  }
}
@media (orientation: landscape) and (max-height: 500px) {
  .delivery {
    grid-template-rows: 46px minmax(0, 1fr);
    grid-template-columns: minmax(0, 1fr) 320px;
    column-gap: 12px;
    padding-bottom: 5px;
  }
  .delivery-game-area {
    padding-top: 4px;
    gap: 3px;
  }
  .delivery-heading > p:first-child,
  .delivery-heading h2,
  .delivery-parcel {
    display: none;
  }
  .delivery-heading h1 {
    font-size: 16px;
  }
  .delivery-controls {
    padding: 0;
    width: 320px;
  }
  .delivery-pad {
    height: 140px;
    width: 175px;
    margin: -6px auto -9px;
  }
  .delivery-pad-label {
    top: 53px;
  }
  .delivery-hand {
    top: 55px;
    left: 82px;
  }
  .delivery-keyboard {
    display: none;
  }
  .delivery-hint {
    font-size: 9px;
    margin-bottom: 3px !important;
  }
  .delivery-control-heading {
    font-size: 10px;
  }
  .delivery-actions {
    margin-top: 4px;
  }
  .delivery-overlay {
    padding: 10px;
  }
  .delivery-result h2 {
    font-size: 17px;
  }
  .delivery-result-stars {
    font-size: 20px !important;
  }
  .delivery-discovery {
    min-height: 30px !important;
    margin-top: 4px;
  }
  .delivery-primary {
    margin-top: 8px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .delivery-hand {
    animation: none;
    top: 95px;
  }
  .delivery-menu::backdrop {
    backdrop-filter: none;
  }
}
</style>
