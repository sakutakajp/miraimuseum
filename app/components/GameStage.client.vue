<script setup lang="ts">
import type { GameState, SceneHooks } from "~/game/scene-types";
import type { createScene } from "~/game/scenes";
import { getWorld, type WorldId } from "~/data/worlds";
import { museumAudio } from "~/game/audio";
import {
  discoveriesFor,
  factFor,
  getDiscovery,
  type DiscoveryId,
} from "~/data/discoveries";
const props = defineProps<{
  world: WorldId;
  visits: Partial<Record<DiscoveryId, number>>;
  muted: boolean;
  level: number;
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
let scene: ReturnType<typeof createScene> | undefined;
let resizeObserver: ResizeObserver | undefined;
let disposed = false,
  timer: ReturnType<typeof setTimeout> | undefined;
const world = computed(() => getWorld(props.world));
const phaseLabel = computed(
  () => world.value.phases[state.value.phase] ?? world.value.name,
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
    const [{ default: Phaser }, { createScene }] = await Promise.all([
      import("phaser"),
      import("~/game/scenes"),
    ]);
    if (disposed || !host.value) return;
    const hooks: SceneHooks = {
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
    };
    scene = createScene(props.world, hooks, props.level);
    // Keep the horizontal game scale (and jump timing) unchanged while using
    // the available height, including changes to mobile browser chrome.
    const worldHeight = () =>
      (host.value!.clientHeight * 420) / host.value!.clientWidth;
    game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: host.value,
      width: 420,
      height: worldHeight(),
      backgroundColor: "#eadfb8",
      pixelArt: true,
      roundPixels: true,
      scene,
      scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
      input: { activePointers: 2 },
      audio: { noAudio: true },
    });
    resizeObserver = new ResizeObserver(() => {
      if (!game || !host.value?.clientWidth || !host.value.clientHeight) return;
      const height = worldHeight();
      if (Math.abs(game.scale.height - height) > 0.1)
        game.scale.setGameSize(420, height);
    });
    resizeObserver.observe(host.value);
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
  resizeObserver?.disconnect();
  museumAudio.stop();
  game?.destroy(true);
});
</script>
<template>
  <section class="expedition-layout" :class="'expedition-' + world.id">
    <div class="stage-heading">
      <div>
        <span class="eyebrow">EXPEDITION {{ world.index }}<template v-if="world.id === 'dinosaur'"> · LEVEL {{ level }}</template></span>
        <h1>{{ world.name }} <small v-if="world.id === 'dinosaur'">Lv. {{ level }}</small></h1>
      </div>
      <p>{{ world.subtitle }}<br />まだ知らない世界に会いに行こう。</p>
    </div>
    <div class="game-frame">
      <div
        ref="host"
        class="game-canvas"
        :aria-label="
          world.name + '。タップ、またはスペースキーで' + world.action
        "
      />
      <div class="game-hud">
        <div class="game-location">
          <span class="live-dot" />{{ phaseLabel
          }}<small
            >{{ state.found.length }} /
            {{ discoveriesFor(world.id).length }} 発見</small
          >
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
      <span>タップ / Space で{{ world.action }}</span
      ><span>失敗しても、何度でも。</span>
    </div>
  </section>
</template>
