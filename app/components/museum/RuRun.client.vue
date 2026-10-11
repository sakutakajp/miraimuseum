<script setup lang="ts">
import PixelArt from "./PixelArt.vue";
import RuSprite from "./RuSprite.vue";
import ReadableText from "~/components/games/caesar/ReadableText.vue";
import { newRun, jumpRun, resumeRun, RunClock } from "~/games/ru-run/physics";
import { runObstacles, RUN_END } from "~/games/ru-run/level";
import { readCollection, recordNap, saveCollection } from "~/museum/collection";
import { historicalNotes } from "~/museum/exhibits";
import MusicToggle from "./MusicToggle.vue";
const s = ref(newRun());
const reduced = ref(false);
const saveAvailable = ref(true);
const dialog = ref<HTMLDialogElement>();
const modal = ref<"menu" | "facts">("menu");
const world = ref<HTMLElement>();
const history = historicalNotes.forest;
const clock = new RunClock();
let raf = 0;
let last = 0;
let recorded = false;
const message = computed(() =>
  s.value.mode === "ready"
    ? "あの こかげで ねたいな。"
    : s.value.mode === "paused"
      ? "ひとやすみ。"
      : s.value.mode === "stumble"
        ? "だいじょうぶ。ここから もういちど。"
        : s.value.mode === "complete"
          ? "ついた！ おやすみ。"
          : "いしや ねっこを ジャンプ！",
);
function stop() {
  cancelAnimationFrame(raf);
  raf = 0;
  last = 0;
  clock.reset();
}
function frame(now: number) {
  const dt = last ? (now - last) / 1000 : 0;
  last = now;
  s.value = clock.advance(s.value, dt);
  if (s.value.mode === "running") raf = requestAnimationFrame(frame);
  else {
    stop();
    if (s.value.mode === "complete") complete();
  }
}
function start() {
  s.value = resumeRun(s.value);
  stop();
  world.value?.focus({ preventScroll: true });
  if (s.value.mode === "running") raf = requestAnimationFrame(frame);
}
function pause() {
  if (s.value.mode === "running") {
    s.value = { ...s.value, mode: "paused" };
    stop();
  }
}
function jump() {
  if (!dialog.value?.open) s.value = jumpRun(s.value);
}
function restart() {
  recorded = false;
  stop();
  s.value = newRun(reduced.value);
  close();
}
function complete() {
  if (recorded) return;
  recorded = true;
  try {
    saveAvailable.value = saveCollection(
      localStorage,
      recordNap(readCollection(localStorage), "forest-run"),
    );
  } catch {
    saveAvailable.value = false;
  }
}
function open(kind: typeof modal.value) {
  pause();
  modal.value = kind;
  dialog.value?.showModal();
}
function close() {
  dialog.value?.close();
}
function key(e: KeyboardEvent) {
  if (dialog.value?.open) return;
  if (e.key === "Escape") {
    pause();
    return;
  }
  if (
    e.target instanceof HTMLElement &&
    e.target.closest("button,a,input,select")
  )
    return;
  if ([" ", "ArrowUp"].includes(e.key) && s.value.mode === "running") {
    e.preventDefault();
    jump();
  }
}
function hidden() {
  if (document.hidden) {
    pause();
  }
}
function toggleSlow() {
  const speed = s.value.speed === 80 ? 120 : 80;
  s.value = {
    ...s.value,
    speed,
    velocity: (s.value.velocity * speed) / s.value.speed,
  };
}
onMounted(() => {
  reduced.value = matchMedia("(prefers-reduced-motion: reduce)").matches;
  s.value = newRun(reduced.value);
  window.addEventListener("keydown", key);
  document.addEventListener("visibilitychange", hidden);
});
onBeforeUnmount(() => {
  stop();
  window.removeEventListener("keydown", key);
  document.removeEventListener("visibilitychange", hidden);
  dialog.value?.close();
});
</script>
<template>
  <main
    class="ru-run"
    lang="ja"
    :data-mode="s.mode"
    :data-distance="Math.floor(s.x)"
    :data-passed="s.passed"
    :data-stumbles="s.stumbles"
  >
    <header class="sunny-header">
      <h1 class="sunny-game-name">
        <ReadableText text="時空ねこの もりラン" />
      </h1>
      <span class="sunny-progress">{{
        s.mode === "complete"
          ? "おひるね"
          : `${Math.floor((s.x / RUN_END) * 100)}%`
      }}</span
      ><MusicToggle class="sunny-icon-button" /><button
        class="sunny-icon-button"
        aria-label="メニュー"
        @click="open('menu')"
      >
        ☰
      </button>
    </header>
    <section
      ref="world"
      class="ru-run-world"
      :class="{ 'ru-run-world--sleep': s.mode === 'complete' }"
      tabindex="0"
      aria-label="もりの みち。スペースか うえキーで ジャンプ"
      @pointerdown="jump"
    >
      <PixelArt
        class="ru-run-art"
        asset="forest-phone"
        wide-asset="forest-wide"
        :anchor-y="0.65"
        alt="かわの そばに きが しげる、きょうりゅうの もり"
      />
      <span class="ru-run-floor" aria-hidden="true" />
      <div
        v-for="obstacle in runObstacles.filter(
          (o) => Math.abs(o.x - s.x) < 1200,
        )"
        :key="obstacle.id"
        class="ru-run-obstacle"
        :class="`ru-run-obstacle--${obstacle.kind}`"
        :style="{
          left: `calc(18% + ${obstacle.x - s.x}px)`,
          width: `${obstacle.width}px`,
          height: `${obstacle.height}px`,
        }"
        aria-hidden="true"
      />
      <div
        class="ru-run-cat"
        :style="{
          bottom: `calc(15% + ${s.y}px)`,
          left: s.mode === 'complete' ? '55%' : '18%',
        }"
      >
        <RuSprite
          :pose="
            s.mode === 'complete'
              ? 'sleep'
              : s.mode === 'running'
                ? 'walk'
                : 'idle'
          "
          :scale="s.mode === 'complete' ? 3 : 2"
        />
      </div>
      <span v-if="s.mode === 'ready'" class="ru-run-place"
        >きょうりゅうの もり</span
      >
      <div
        v-if="s.mode === 'paused' || s.mode === 'stumble'"
        class="ru-run-pause-label"
      >
        {{ s.mode === "paused" ? "ひとやすみ" : "ここから もういちど" }}
      </div>
      <span
        v-if="s.mode === 'complete'"
        class="ru-run-nap-light"
        aria-hidden="true"
      />
    </section>
    <footer class="ru-run-controls">
      <div class="sunny-guide" role="status" aria-live="polite">
        <p>{{ message }}</p>
      </div>
      <div class="sunny-main-actions">
        <button
          v-if="s.mode === 'running'"
          class="museum-button museum-button--gold ru-run-jump"
          @click="jump"
        >
          ジャンプ</button
        ><button
          v-else-if="s.mode !== 'complete'"
          class="museum-button museum-button--gold"
          @click="start"
        >
          {{
            s.mode === "ready"
              ? "はしる"
              : s.mode === "paused"
                ? "つづける"
                : "ここから はしる"
          }}</button
        ><NuxtLink v-else to="/" class="museum-button museum-button--gold"
          >はくぶつかんへ</NuxtLink
        >
      </div>
      <div class="sunny-tools">
        <button v-if="s.mode === 'running'" class="sunny-tool" @click="pause">
          ひとやすみ</button
        ><button
          v-else-if="s.mode === 'complete'"
          class="sunny-tool"
          @click="restart"
        >
          もういちど</button
        ><button v-else class="sunny-tool" @click="toggleSlow">
          {{ s.speed === 80 ? "ゆっくり：オン" : "ゆっくり" }}</button
        ><button class="sunny-tool" @click="open('facts')">
          ほんとうのこと</button
        ><NuxtLink v-if="s.mode === 'complete'" class="sunny-tool" to="/naps"
          >おひるねずかん</NuxtLink
        ><button v-else class="sunny-tool" @click="open('menu')">
          あそびかた
        </button>
      </div>
    </footer>
    <dialog
      ref="dialog"
      class="museum-dialog"
      @close="world?.focus({ preventScroll: true })"
    >
      <div class="museum-dialog-head">
        <h2>{{ modal === "menu" ? "あそびかた" : "てんじの おはなし" }}</h2>
        <button class="museum-button museum-button--small" @click="close">
          とじる
        </button>
      </div>
      <template v-if="modal === 'menu'"
        ><p>いしの まえで ジャンプ！</p>
        <p>みちを タップ、ジャンプボタン、スペースか うえキーでも とべるよ。</p>
        <p>つまずいても、ちかくから つづけられるよ。</p>
        <p v-if="!saveAvailable">きろくを のこせないけれど、あそべるよ。</p>
        <nav class="museum-menu-links">
          <button class="museum-button" @click="restart">
            さいしょから あそぶ</button
          ><NuxtLink to="/">はくぶつかんへ</NuxtLink
          ><NuxtLink to="/naps">おひるねずかん</NuxtLink>
        </nav></template
      ><template v-else
        ><h3>ほんとうのこと</h3>
        <p>{{ history.fact }}</p>
        <p>{{ history.plants }}</p>
        <h3>ゲームの くふう</h3>
        <p>{{ history.invention }}</p>
        <h3>かんがえて えに したこと</h3>
        <p>{{ history.estimate }}</p>
        <NuxtLink class="museum-text-link" to="/about"
          >おとなの かたへ・しりょう</NuxtLink
        ></template
      >
    </dialog>
  </main>
</template>
