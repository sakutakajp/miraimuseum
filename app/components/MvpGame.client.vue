<script setup lang="ts">
import { TresCanvas } from "@tresjs/core";
import { Shooter } from "~/games/shooter";
import type { GameId, StageResult } from "~/games/catalog";
import type { DinosaurScene } from "~/game/DinosaurScene";
import { museumAudio } from "~/game/audio";
const props = defineProps<{ game: GameId; demo: boolean }>();
const emit = defineEmits<{ finish: [result: StageResult]; leave: [] }>();
const { t } = useLanguage();
const host = ref<HTMLDivElement>();
const paused = ref(false);
const ready = ref(false);
const error = ref(false);
const health = ref(3);
const score = ref(0);
const distance = ref(0);
const shooter = shallowReactive(new Shooter());
let scene: DinosaurScene | undefined;
let phaser: import("phaser").Game | undefined;
let observer: ResizeObserver | undefined;
let disposed = false;
let done = false;
let lastImpact = 0;
const muted = ref(museumAudio.muted);
const latestReward = computed(() =>
  [...shooter.impacts].reverse().find((i) => i.points > 0),
);
const damageFlash = computed(() =>
  shooter.impacts.some((i) => i.kind === "damage" && i.age < 0.3),
);
function toggleSound() {
  muted.value = !muted.value;
  museumAudio.setMuted(muted.value);
  if (!muted.value) museumAudio.unlock();
}
const demo = ref(props.demo);
let demoTimer: ReturnType<typeof setTimeout> | undefined;
function finish(result: StageResult) {
  if (done || disposed) return;
  done = true;
  emit("finish", result);
}
function tick() {
  ready.value = true;
  for (const impact of shooter.impacts) {
    if (impact.id <= lastImpact) continue;
    lastImpact = impact.id;
    if (impact.kind === "burst") museumAudio.impact(impact.combo);
    else if (impact.kind === "spark") museumAudio.spark();
    else if (impact.kind === "pickup") museumAudio.discover();
    else museumAudio.bump();
  }
  health.value = shooter.shield;
  score.value = shooter.score;
  distance.value = shooter.elapsed / 40;
  if (shooter.finished)
    finish({
      game: props.game,
      stage: 1,
      cleared: shooter.shield > 0,
      score: shooter.score,
      health: shooter.shield,
      elapsed: shooter.elapsed,
    });
}
function move(event: PointerEvent) {
  if (event.type === "pointerdown") museumAudio.unlock();
  if (event.buttons !== 1 || paused.value || demo.value) return;
  const rect = host.value!.getBoundingClientRect();
  shooter.move(
    ((event.clientX - rect.left) / rect.width - 0.5) * 6,
    (0.5 - (event.clientY - rect.top) / rect.height) * 4,
  );
}
function pause(value: boolean) {
  paused.value = value;
  if (!value) museumAudio.unlock();
  scene?.setPaused(value || demo.value);
}
function visibility() {
  if (document.hidden) pause(true);
}
function key(event: KeyboardEvent) {
  museumAudio.unlock();
  if (event.key === "Escape") pause(!paused.value);
  if (props.game === "star-flight") {
    const dx =
      event.key === "ArrowLeft" ? -0.3 : event.key === "ArrowRight" ? 0.3 : 0;
    const dy =
      event.key === "ArrowUp" ? 0.3 : event.key === "ArrowDown" ? -0.3 : 0;
    if (dx || dy) {
      event.preventDefault();
      if (!paused.value && !demo.value)
        shooter.move(shooter.x + dx, shooter.y + dy);
    }
  }
}
function beginDemo() {
  if (demo.value)
    demoTimer = setTimeout(() => {
      demo.value = false;
      scene?.setPaused(paused.value);
    }, 3000);
}
onMounted(async () => {
  document.addEventListener("visibilitychange", visibility);
  window.addEventListener("keydown", key);
  if (props.game === "star-flight") {
    beginDemo();
    return;
  }
  try {
    const [{ default: Phaser }, { DinosaurScene }] = await Promise.all([
      import("phaser"),
      import("~/game/DinosaurScene"),
    ]);
    if (disposed || !host.value) return;
    scene = new DinosaurScene(
      {
        state: (s) => {
          health.value = Math.max(0, 3 - scene!.expedition.bumps);
          distance.value = s.distance;
          score.value =
            scene!.expedition.found.size * 200 +
            Math.max(
              0,
              scene!.expedition.obstacles.filter(
                (o) => o.x < scene!.expedition.x,
              ).length - scene!.expedition.bumps,
            ) *
              100;
        },
        discover: () => {},
        cue: () => {},
        finish: () => {
          const e = scene!.expedition;
          health.value = Math.max(0, 3 - e.bumps);
          score.value =
            e.found.size * 200 +
            Math.max(0, e.obstacles.filter((o) => o.x < e.x).length - e.bumps) *
              100;
          const cleared = e.bumps < 3;
          const elapsed = e.x / e.settings.speed;
          finish({
            game: props.game,
            stage: 1,
            cleared,
            score:
              score.value +
              (cleared
                ? health.value * 500 +
                  Math.round(Math.max(0, 60 - elapsed)) * 20
                : 0),
            health: health.value,
            elapsed,
          });
        },
      },
      1,
      true,
    );
    scene.initialPaused = demo.value || paused.value;
    const height = () =>
      (host.value!.clientHeight * 420) / host.value!.clientWidth;
    phaser = new Phaser.Game({
      type: Phaser.AUTO,
      parent: host.value,
      width: 420,
      height: height(),
      pixelArt: true,
      scene,
      scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
      audio: { noAudio: true },
    });
    observer = new ResizeObserver(() => {
      if (host.value?.clientWidth) phaser?.scale.setGameSize(420, height());
    });
    observer.observe(host.value);
    ready.value = true;
    beginDemo();
  } catch (e) {
    console.error(e);
    error.value = true;
  }
});
onBeforeUnmount(() => {
  disposed = true;
  clearTimeout(demoTimer);
  observer?.disconnect();
  phaser?.destroy(true);
  museumAudio.stop();
  document.removeEventListener("visibilitychange", visibility);
  window.removeEventListener("keydown", key);
});
</script>
<template>
  <section class="mvp-play" :class="game">
    <div
      ref="host"
      class="mvp-canvas"
      @pointerdown="move"
      @pointermove="move"
      :aria-label="
        t(game === 'star-flight' ? 'ドラッグで移動' : 'タップでジャンプ')
      "
    >
      <TresCanvas
        v-if="game === 'star-flight'"
        clear-color="#080d29"
        @error="error = true"
        ><SpaceWorld :model="shooter" :paused="paused || demo" @tick="tick"
      /></TresCanvas>
    </div>
    <div
      v-if="game === 'star-flight' && !paused && !demo"
      class="shoot-feedback"
      :class="{ 'damage-flash': damageFlash }"
      aria-hidden="true"
    >
      <div v-if="latestReward" :key="latestReward.id" class="hit-reward">
        <strong>+{{ latestReward.points }}</strong
        ><span v-if="latestReward.kind === 'burst'">{{
          latestReward.combo > 1 ? latestReward.combo + " COMBO!" : "HIT!"
        }}</span>
      </div>
    </div>
    <div class="mvp-hud">
      <strong>{{ "♥".repeat(health) }}{{ "♡".repeat(3 - health) }}</strong
      ><span>SCORE {{ score.toLocaleString() }}</span
      ><button :aria-label="t('一時停止')" @click="pause(true)">II</button
      ><progress :value="distance" max="1" />
    </div>
    <div v-if="demo && !error" class="mvp-overlay demo">
      <div class="demo-finger" :class="{ drag: game === 'star-flight' }">
        ☝
      </div>
      <h2>
        <RubyText
          :text="game === 'star-flight' ? 'ドラッグで移動' : 'タップでジャンプ'"
        />
      </h2>
    </div>
    <div v-if="paused || error" class="mvp-overlay">
      <h2>
        <RubyText :text="error ? '読み込めませんでした' : 'ひとやすみ'" />
      </h2>
      <LanguageSwitch />
      <button class="button" @click="toggleSound">
        <RubyText :text="muted ? '音をオンにする' : '音をオフにする'" />
      </button>
      <button v-if="!error" class="button primary" @click="pause(false)">
        <RubyText text="冒険をつづける" /></button
      ><button class="button" @click="emit('leave')">
        <RubyText text="博物館にもどる" />
      </button>
    </div>
  </section>
</template>
