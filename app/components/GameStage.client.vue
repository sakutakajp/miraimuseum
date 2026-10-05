<script setup lang="ts">
import type { GameState, DinosaurScene } from "~/game/DinosaurScene";
import { museumAudio } from "~/game/audio";
import { factFor, getDiscovery, type DiscoveryId } from "~/data/discoveries";
const props = defineProps<{
  visits: Partial<Record<DiscoveryId, number>>;
  muted: boolean;
}>();
const emit = defineEmits<{
  finish: [ids: DiscoveryId[]];
  leave: [];
  sound: [];
}>();
const host = ref<HTMLDivElement>();
const state = ref<GameState>({
  phase: "present",
  distance: 0,
  found: [],
  paused: false,
});
const loading = ref(true),
  error = ref(false);
const toast = ref<{ title: string; fact?: string; sprite?: string } | null>(
  null,
);
let game: import("phaser").Game | undefined;
let scene: DinosaurScene | undefined;
let disposed = false,
  timer: ReturnType<typeof setTimeout> | undefined;
const phaseLabel = computed(
  () =>
    ({
      present: "化石の眠る大地",
      rewind: "時間をこえて",
      past: "白亜紀の森",
      chase: "大きな出会い",
      ending: "未来へつなぐ発見",
    })[state.value.phase],
);
function showToast(value: typeof toast.value, duration = 3500) {
  clearTimeout(timer);
  toast.value = value;
  timer = setTimeout(() => {
    toast.value = null;
  }, duration);
}
function pause(value: boolean) {
  scene?.setPaused(value);
}
function visibility() {
  if (document.hidden) pause(true);
}
watch(
  () => props.muted,
  (value) => museumAudio.setMuted(value),
  { immediate: true },
);
onMounted(async () => {
  document.addEventListener("visibilitychange", visibility);
  try {
    const [{ default: Phaser }, { DinosaurScene: Scene }] = await Promise.all([
      import("phaser"),
      import("~/game/DinosaurScene"),
    ]);
    if (disposed || !host.value) return;
    scene = new Scene({
      state: (value) => {
        state.value = value;
      },
      discover: (id) =>
        showToast({
          title: getDiscovery(id).name,
          sprite: getDiscovery(id).sprite,
          fact: factFor(id, props.visits[id] ?? 0),
        }),
      cue: (message) => showToast({ title: message }, 2800),
      finish: (ids) => emit("finish", ids),
    });
    game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: host.value,
      width: 420,
      height: 700,
      backgroundColor: "#eadfb8",
      pixelArt: true,
      roundPixels: true,
      scene,
      scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
      input: { activePointers: 2 },
      audio: { noAudio: true },
    });
    loading.value = false;
  } catch (err) {
    error.value = true;
    loading.value = false;
    console.error("ゲームの読み込みに失敗しました", err);
  }
});
onBeforeUnmount(() => {
  disposed = true;
  clearTimeout(timer);
  document.removeEventListener("visibilitychange", visibility);
  museumAudio.stop();
  game?.destroy(true);
});
</script>
<template>
  <section class="expedition-layout">
    <div class="stage-heading">
      <div>
        <span class="eyebrow">EXPEDITION 01</span>
        <h1>恐竜の世界</h1>
      </div>
      <p>走って、跳んで。<br />まだ知らない世界に会いに行こう。</p>
    </div>
    <div class="game-frame">
      <div
        ref="host"
        class="game-canvas"
        aria-label="恐竜ステージ。画面をタップ、またはスペースキーでジャンプ"
      />
      <div class="game-hud">
        <div class="game-location">
          <span class="live-dot" />{{ phaseLabel
          }}<small>{{ state.found.length }} / 6 発見</small>
        </div>
        <div
          class="game-progress"
          role="progressbar"
          aria-label="ステージの進み具合"
          :aria-valuenow="Math.round(state.distance * 1000) / 10"
          aria-valuemin="0"
          aria-valuemax="100"
        >
          <span :style="{ width: `${state.distance * 100}%` }" />
        </div>
      </div>
      <Transition name="toast"
        ><div
          v-if="toast && !state.paused"
          class="discovery-toast"
          aria-live="polite"
        >
          <PixelSprite v-if="toast.sprite" :name="toast.sprite" />
          <div>
            <small v-if="toast.sprite">あたらしい発見！</small
            ><strong>{{ toast.title }}</strong>
            <p v-if="toast.fact">{{ toast.fact }}</p>
          </div>
        </div></Transition
      >
      <button
        class="game-pause icon-button"
        :disabled="loading || error"
        aria-label="一時停止"
        @click="pause(true)"
      >
        Ⅱ
      </button>
      <div v-if="loading || error" class="game-overlay">
        <PixelSprite name="robot" />
        <h2>{{ error ? "読み込めませんでした" : "冒険の準備中…" }}</h2>
        <button v-if="error" class="button primary" @click="emit('leave')">
          博物館にもどる
        </button>
      </div>
      <div v-if="state.paused" class="game-overlay pause-overlay">
        <PixelSprite name="robot" /><span class="eyebrow"
          >TAKE A LITTLE BREAK</span
        >
        <h2>ひとやすみ</h2>
        <p>発見は、きみを待っているよ。</p>
        <button
          class="button primary"
          @click="
            museumAudio.unlock();
            pause(false);
          "
        >
          冒険をつづける <span>→</span></button
        ><button class="button subtle" @click="emit('sound')">
          {{ muted ? "音をオンにする" : "音をオフにする" }}</button
        ><button class="text-button" @click="emit('leave')">
          博物館にもどる（今回の発見は保存されません）
        </button>
      </div>
    </div>
    <div class="game-footnote">
      <span>タップ / Space でジャンプ</span><span>失敗しても、何度でも。</span>
    </div>
  </section>
</template>
