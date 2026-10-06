<script setup lang="ts">
import DeepTimeGame from "./games/deep-time/DeepTimeGame.client.vue";
import { games, getGame, type GameId, type StageResult } from "~/games/catalog";
import {
  GAME_SAVE_KEY,
  emptyGameProgress,
  parseGameProgress,
  recordGameResult,
  type GameProgress,
} from "~/games/progress";
import StarDiveResult from "./games/star-dive/StarDiveResult.vue";
import type { ClearResult, DeepTimeRecord } from "~/game/dinosaur/types";
import {
  DEEP_TIME_SAVE_KEY,
  emptyRecord,
  parseRecord,
} from "~/game/dinosaur/systems/records";
import AsteroidExhibit from "./games/star-dive/AsteroidExhibit.vue";
const { locale, initializeLanguage, t } = useLanguage();
const view = ref<"home" | "detail" | "stages" | "game" | "result">("home");
const active = ref<GameId>("dinosaur-run");
const game = computed(() => getGame(active.value));
const progress = ref(emptyGameProgress());
const deepTimeRecord = ref(emptyRecord());
// Prototype scores remain stored; the new level's completion comes from its own record.
const displayProgress = computed<GameProgress>(() => {
  const saved = deepTimeRecord.value;
  const dinosaur: GameProgress["dinosaur-run"] = {
    best: saved.bestClearScore,
    stages: {},
    unlocked: saved.cleared ? 2 : 1,
  };
  if (saved.cleared)
    dinosaur.stages["1"] = { best: saved.bestClearScore, cleared: true };
  return { ...progress.value, "dinosaur-run": dinosaur };
});
const storageAvailable = ref(true);
const mounted = ref(false);
const result = ref<StageResult>();
const run = ref(0);
const showDemo = ref(true);
const attempted = new Set<GameId>();
const newBest = ref(false);
const exhibit = ref(false);
const filter = ref("");
const axis = ref<"theme" | "style">("theme");
const recommended = ref(games[0]!);
const listed = computed(() =>
  games.filter((g) => !filter.value || g[axis.value] === filter.value),
);
const choices = computed(() => [...new Set(games.map((g) => g[axis.value]))]);
function navigate(next: typeof view.value) {
  view.value = next;
  if (import.meta.client) window.scrollTo(0, 0);
}
function select(id: GameId) {
  active.value = id;
  navigate("detail");
}
function start() {
  showDemo.value =
    !attempted.has(active.value) && !progress.value[active.value].stages["1"];
  attempted.add(active.value);
  run.value++;
  navigate("game");
}
function deepTimeCleared(value: ClearResult) {
  progress.value = recordGameResult(progress.value, {
    game: "dinosaur-run",
    stage: 1,
    cleared: true,
    score: value.score,
    health: 1,
    elapsed: 76.8,
  });
  try {
    localStorage.setItem(GAME_SAVE_KEY, JSON.stringify(progress.value));
  } catch {
    storageAvailable.value = false;
  }
}
function deepTimeBest(value: DeepTimeRecord) {
  deepTimeRecord.value = value;
}
function finish(value: StageResult) {
  newBest.value =
    value.cleared && value.score > progress.value[value.game].best;
  result.value = value;
  progress.value = recordGameResult(progress.value, value);
  try {
    localStorage.setItem(GAME_SAVE_KEY, JSON.stringify(progress.value));
  } catch {
    storageAvailable.value = false;
  }
  navigate("result");
}
onMounted(() => {
  initializeLanguage();
  try {
    progress.value = parseGameProgress(localStorage.getItem(GAME_SAVE_KEY));
    deepTimeRecord.value = parseRecord(
      localStorage.getItem(DEEP_TIME_SAVE_KEY),
    );
  } catch {
    storageAvailable.value = false;
  }
  recommended.value = games[Math.floor(Date.now() / 86400000) % games.length]!;
  mounted.value = true;
});
useHead(() => ({
  htmlAttrs: { lang: locale.value },
  title:
    locale.value === "ja"
      ? "みらい博物館 — いろんな世界で、あそぼう。"
      : "MIRAI MUSEUM — A world of games",
  meta: [{ name: "description", content: t("いろんな世界で、あそぼう。") }],
}));
</script>
<template>
  <div
    class="v2-shell"
    :class="{ playing: view === 'game' }"
    :data-ready="mounted"
  >
    <header v-if="view !== 'game'" class="v2-header">
      <button
        class="v2-brand"
        @click="
          filter = '';
          navigate('home');
        "
      >
        <span>✦</span>
        <div>
          MIRAI MUSEUM<small><RubyText text="みらい博物館" /></small>
        </div>
      </button>
      <div class="museum-header-actions">
        <NuxtLink to="/" class="museum-opening-link">MIRAI CORE ↗</NuxtLink
        ><LanguageSwitch />
      </div>
    </header>
    <main v-if="view === 'home'" class="v2-main">
      <div class="v2-intro">
        <span class="eyebrow">PLAY THE EXHIBITION</span>
        <h1><RubyText text="いろんな世界で、あそぼう。" /></h1>
        <p><RubyText text="きょうは、どんな冒険にする？" /></p>
      </div>
      <button
        class="v2-feature"
        :style="{ '--accent': recommended.color }"
        @click="select(recommended.id)"
      >
        <div>
          <span class="v2-tag"><RubyText text="今日のおすすめ" /></span>
          <h2><RubyText :text="recommended.title" /></h2>
          <p><RubyText :text="recommended.description" /></p>
          <span class="button primary"><RubyText text="ゲームを見る" /> →</span>
        </div>
        <div class="feature-art">
          <GameArtwork :game="recommended.id" /><small>{{
            recommended.visual
          }}</small>
        </div>
      </button>
      <section class="v2-browse">
        <div class="v2-tabs">
          <button
            :class="{ selected: axis === 'theme' }"
            @click="
              axis = 'theme';
              filter = '';
            "
          >
            <RubyText text="展示テーマから選ぶ" /></button
          ><button
            :class="{ selected: axis === 'style' }"
            @click="
              axis = 'style';
              filter = '';
            "
          >
            <RubyText text="あそびかたから選ぶ" />
          </button>
        </div>
        <div class="v2-chips">
          <button :aria-pressed="filter === ''" @click="filter = ''">
            <RubyText text="すべて" /></button
          ><button
            v-for="choice in choices"
            :key="choice"
            :aria-pressed="filter === choice"
            @click="filter = choice"
          >
            <RubyText :text="choice" />
          </button>
        </div>
        <div class="v2-grid">
          <GameCard
            v-for="item in listed"
            :key="item.id"
            :game="item"
            :record="displayProgress[item.id]"
            :best-progress="
              item.id === 'dinosaur-run'
                ? deepTimeRecord.bestProgress
                : undefined
            "
            @select="select(item.id)"
          />
        </div>
      </section>
      <button
        v-if="progress['star-flight'].discoveries?.includes('asteroid')"
        class="museum-discovery"
        @click="exhibit = true"
      >
        <span>✦ DISCOVERY · 001</span
        ><strong><RubyText text="小惑星の展示" /></strong><span>→</span>
      </button>
    </main>
    <main v-else-if="view === 'detail' || view === 'stages'" class="v2-main">
      <button
        class="text-button"
        @click="navigate(view === 'stages' ? 'detail' : 'home')"
      >
        ← <RubyText text="もどる" />
      </button>
      <section class="v2-detail" :style="{ '--accent': game.color }">
        <div class="detail-art">
          <GameArtwork :game="game.id" /><span>{{ game.visual }}</span>
        </div>
        <div>
          <span class="eyebrow"
            ><RubyText :text="game.theme" /> / <RubyText :text="game.style"
          /></span>
          <h1><RubyText :text="game.title" /></h1>
          <p><RubyText :text="game.description" /></p>
          <div class="v2-stats">
            <span>{{ game.duration }}</span
            ><span>{{
              game.id === "dinosaur-run" ? "ONE HIT / FAST RETRY" : "♥ × 3"
            }}</span
            ><span
              >BEST
              {{
                game.id === "dinosaur-run" && !deepTimeRecord.cleared
                  ? Math.floor(deepTimeRecord.bestProgress * 100) + "%"
                  : displayProgress[game.id].best.toLocaleString()
              }}</span
            >
          </div>
          <p><RubyText :text="game.control" /></p>
          <button
            v-if="view === 'detail'"
            class="button primary"
            @click="navigate('stages')"
          >
            <RubyText text="ステージを選ぶ" /> →
          </button>
        </div>
      </section>
      <section v-if="view === 'stages'" class="stage-list">
        <h2><RubyText text="ステージを選ぶ" /></h2>
        <button
          v-for="stage in game.stages"
          :key="stage.id"
          class="stage-choice"
          :disabled="stage.id > displayProgress[game.id].unlocked"
          @click="start"
        >
          <span
            >STAGE {{ stage.id }}
            <span v-if="displayProgress[game.id].stages[stage.id]?.cleared"
              >✓</span
            ></span
          ><strong><RubyText :text="stage.title" /></strong
          ><span
            >BEST
            {{
              game.id === "dinosaur-run" && !deepTimeRecord.cleared
                ? Math.floor(deepTimeRecord.bestProgress * 100) + "%"
                : displayProgress[game.id].stages[stage.id]?.best || 0
            }}
            →</span
          >
        </button>
        <p v-if="game.id === 'star-flight'" class="v2-muted">
          <RubyText text="次のステージは、これから登場！" />
        </p>
      </section>
    </main>
    <ClientOnly v-else-if="view === 'game'"
      ><StarDiveGame
        v-if="active === 'star-flight'"
        :key="run"
        :demo="showDemo"
        @finish="finish"
        @leave="navigate('home')" /><DeepTimeGame
        v-else
        :key="run"
        @record="deepTimeBest"
        @cleared="deepTimeCleared"
        @leave="navigate('stages')"
    /></ClientOnly>
    <StarDiveResult
      v-else-if="view === 'result' && result?.game === 'star-flight'"
      :result="result"
      :best="progress['star-flight'].best"
      :new-best="newBest"
      @retry="start"
      @leave="navigate('home')"
    />
    <main v-else-if="view === 'result' && result" class="v2-main v2-result">
      <div class="result-icon">{{ result.cleared ? "🏆" : "💫" }}</div>
      <span class="eyebrow">{{ game.visual }} · STAGE 1</span>
      <h1>
        <RubyText
          :text="result.cleared ? 'ステージクリア！' : 'もう一度、チャレンジ！'"
        />
      </h1>
      <h2><RubyText :text="game.title" /></h2>
      <div class="score-panel">
        <small>SCORE</small><strong>{{ result.score.toLocaleString() }}</strong
        ><span>BEST {{ progress[active].best.toLocaleString() }}</span>
      </div>
      <p>
        {{ "♥".repeat(result.health) }} · {{ result.elapsed.toFixed(1) }} SEC
      </p>
      <p v-if="result.cleared">
        <RubyText text="次のステージは、これから登場！" />
      </p>
      <div class="result-actions">
        <button class="button primary" @click="start">
          <RubyText text="もう一度あそぶ" /></button
        ><button class="button" @click="navigate('home')">
          <RubyText text="博物館にもどる" />
        </button>
      </div>
    </main>
    <footer v-if="view !== 'game'" class="v2-footer">
      <p v-if="!storageAvailable" role="status">
        <RubyText text="この端末では記録を保存できません。" />
      </p>
      <span>MIRAI MUSEUM · PLAY / EXPLORE / REPEAT</span>
      <p><RubyText text="記録はこのブラウザーに保存されます。" /></p>
    </footer>
    <AsteroidExhibit v-if="exhibit" @close="exhibit = false" />
  </div>
</template>
