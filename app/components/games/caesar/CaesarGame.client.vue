<script setup lang="ts">
import PixelArt from "~/components/museum/PixelArt.vue";
import RuSprite from "~/components/museum/RuSprite.vue";
import ShiftBoard from "./ShiftBoard.vue";
import KanaOrder from "./KanaOrder.vue";
import { KANA, shiftWord } from "~/games/caesar/cipher";
import { intro, lessons, sunnyCopy as text } from "~/games/caesar/sunny-copy";
import { practices, sunnyQuestions } from "~/games/caesar/sunny-questions";
import {
  newSunnyState,
  sunnyTransition,
  practiceWord,
  canSubmit,
  type SunnyAction,
} from "~/games/caesar/sunny-state";
import {
  readSunnyProgress,
  saveSunnyProgress,
} from "~/games/caesar/sunny-progress";
import { readCollection, recordNap, saveCollection } from "~/museum/collection";
import { historicalNotes } from "~/museum/exhibits";
import MusicToggle from "~/components/museum/MusicToggle.vue";
const state = ref(newSunnyState());
const dialog = ref<HTMLDialogElement>();
const modal = ref<"menu" | "order" | "help" | "facts" | "restart" | "demo">(
  "menu",
);
const saveAvailable = ref(true);
const demoStep = ref(0);
const history = historicalNotes.roman;
const q = computed(() => sunnyQuestions[state.value.index]!);
const p = computed(() => practices[state.value.index]!);
const active = computed(() => state.value.phase === "active");
const waiting = computed(() => state.value.phase === "waiting");
const shiftDescription = computed(
  () =>
    `${state.value.amount}つ ${state.value.direction === "back" ? "もどす" : "すすめる"}`,
);
const worldOpen = computed(
  () =>
    ["nap", "lesson"].includes(state.value.view) ||
    (state.value.view === "quiz" &&
      state.value.index === sunnyQuestions.length - 1 &&
      state.value.correct === true),
);
const message = computed(() => {
  const s = state.value;
  if (s.view === "intro") return intro[s.index]!;
  if (s.view === "nap") return "いい ひなた。おやすみ。";
  if (s.view === "lesson") return lessons[s.index]!;
  if (s.view === "key")
    return s.correct
      ? "うごいた かずは 2つ。これが かぎだよ。"
      : "おくの とびらは、あ → う。うごきを みよう。";
  if (s.correct === true)
    return s.view === "quiz"
      ? q.value.success
      : s.view === "cycle"
        ? "はんたいに うごかすと、もとに もどるよ。"
        : s.index === 0
          ? "い → あ。うごいた！"
          : "ぜんぶ いっしょに うごいたね。";
  if (s.hint >= 0)
    return s.view === "quiz" ? q.value.hints[s.hint]! : p.value.hint;
  if (s.correct === false) return text.wrong;
  if (s.view === "cycle")
    return s.index === 0
      ? "『ん』の つぎは『あ』だよ。"
      : "はんたいに もどしてみよう。";
  if (s.view === "practice") return p.value.instruction;
  if (q.value.kind === "prediction") return q.value.instruction;
  if (s.control === "direction")
    return "よむ ときは はんたい。むきを えらぼう。";
  if (s.control === "number") return "つぎは、かずを えらぼう。";
  return q.value.instruction;
});
const progressLabel = computed(() => {
  const s = state.value;
  return s.view === "practice"
    ? `1 / ${s.index + 1}・3`
    : s.view === "quiz"
      ? `2 / ${s.index + 1}・3`
      : s.view === "cycle"
        ? "もじの わ"
        : s.view === "key"
          ? "2 / れんしゅう"
          : worldOpen.value
            ? "おひるね"
            : "たびの はじまり";
});
let timer: ReturnType<typeof setTimeout> | undefined;
let returnFocus: HTMLElement | null = null;
let reduced = false;
let hasRecordedNap = false;
function arm() {
  clearTimeout(timer);
  const phase = state.value.phase;
  if (phase === "entering" || phase === "celebrating")
    timer = setTimeout(
      () => send({ type: phase === "entering" ? "ready" : "settle" }),
      phase === "entering" ? 220 : reduced ? 220 : 600,
    );
}
function persist() {
  try {
    saveAvailable.value =
      saveSunnyProgress(localStorage, state.value.progress) &&
      saveAvailable.value;
  } catch {
    saveAvailable.value = false;
  }
}
function send(action: SunnyAction) {
  if (dialog.value?.open && action.type !== "ready" && action.type !== "settle")
    return;
  const previous = state.value,
    next = sunnyTransition(previous, action);
  if (next === previous) return;
  state.value = next;
  arm();
  if (previous.progress !== next.progress) persist();
  if (next.view === "nap" && !hasRecordedNap) {
    hasRecordedNap = true;
    try {
      saveAvailable.value =
        saveCollection(
          localStorage,
          recordNap(readCollection(localStorage), "sunny-room"),
        ) && saveAvailable.value;
    } catch {
      saveAvailable.value = false;
    }
  }
}
function open(kind: typeof modal.value) {
  returnFocus = document.activeElement as HTMLElement;
  modal.value = kind;
  demoStep.value = 0;
  dialog.value?.showModal();
}
function close() {
  dialog.value?.close();
}
function closed() {
  returnFocus?.focus({ preventScroll: true });
}
function hint() {
  send({ type: "hint" });
  if (state.value.view === "quiz" && state.value.hint === 2) open("demo");
}
function restart() {
  close();
  hasRecordedNap = false;
  state.value = newSunnyState(state.value.progress);
  arm();
}
onMounted(() => {
  arm();
  reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  try {
    const old = readSunnyProgress(localStorage);
    state.value = newSunnyState(old);
  } catch {
    saveAvailable.value = false;
  }
});
onBeforeUnmount(() => {
  clearTimeout(timer);
  dialog.value?.close();
});
const demoAmount = computed(() =>
  Math.min(demoStep.value, Math.abs(q.value.shift)),
);
const demoLetter = computed(() =>
  shiftWord(q.value.input[0]!, demoAmount.value * Math.sign(q.value.shift)),
);
</script>
<template>
  <main
    class="sunny-game"
    lang="ja"
    :data-view="state.view"
    :data-index="state.index"
    :data-phase="state.phase"
    :data-control="state.control"
  >
    <header class="sunny-header">
      <span class="sunny-game-name">{{ text.title }}</span
      ><span class="sunny-progress">{{ progressLabel }}</span
      ><MusicToggle class="sunny-icon-button" /><button
        class="sunny-icon-button"
        aria-label="メニュー"
        @click="open('menu')"
      >
        ☰
      </button>
    </header>
    <section
      class="sunny-world"
      :class="{
        'sunny-world--open': worldOpen,
        'sunny-world--travel': state.view === 'intro' && state.index === 0,
      }"
      aria-label="ローマの いえと ルゥ"
    >
      <PixelArt
        class="sunny-world-art"
        :asset="worldOpen ? 'nap-phone' : 'courtyard-phone'"
        :wide-asset="worldOpen ? 'nap-wide' : 'courtyard-wide'"
        :anchor-x="0.65"
        :anchor-y="worldOpen ? 0.7 : 0.59"
      />
      <span
        v-if="state.view === 'intro' && state.index === 0"
        class="sunny-portal"
        aria-hidden="true"
      />
      <div class="sunny-world-cat">
        <RuSprite
          :pose="
            worldOpen
              ? 'sleep'
              : state.correct
                ? 'happy'
                : state.view === 'intro'
                  ? 'walk'
                  : 'idle'
          "
          :scale="2"
        />
      </div>
      <span
        v-if="state.view === 'quiz'"
        class="sunny-world-seals"
        aria-label="ひらいた しかけ"
        ><i
          v-for="i in 3"
          :key="i"
          :class="{ 'is-lit': i <= state.index + (state.correct ? 1 : 0) }"
          >{{ i <= state.index + (state.correct ? 1 : 0) ? "◆" : "◇" }}</i
        ></span
      >
      <span v-if="state.view === 'intro'" class="sunny-world-place"
        >ローマの いえ</span
      >
    </section>
    <section
      class="sunny-puzzle"
      :class="{
        'sunny-puzzle--attention': state.hint >= 0 || state.correct === false,
      }"
    >
      <template v-if="state.view === 'intro'"
        ><div class="sunny-conversation">
          <small>ルゥ</small>
          <h1>{{ message }}</h1>
          <p>
            {{
              state.index === 0
                ? "おてがみの ひかりを ぬけると……"
                : "とびらの むこうは、ひなた。"
            }}
          </p>
        </div></template
      >
      <template v-else-if="state.view === 'practice'"
        ><div class="sunny-question-head">
          <h1>{{ p.title }}</h1>
          <span class="sunny-target"
            >おてほん <strong>{{ p.expected }}</strong></span
          >
        </div>
        <ShiftBoard
          :input="p.input"
          :output="practiceWord(state)"
          :interactive="active && state.index > 0"
          :changed="state.shift !== 0"
          @shift="send({ type: 'shift', amount: $event })"
        />
        <div class="sunny-shift-note">
          {{ Math.abs(state.shift) }}つ
          {{
            state.shift < 0
              ? "もどした"
              : state.shift > 0
                ? "すすめた"
                : "うごかした"
          }}<span v-if="p.input.length > 1">・ぜんぶ いっしょ</span>
        </div>
        <p v-if="state.index < 2" class="sunny-letter-order">
          あ　い　う　え　お　か
        </p></template
      >
      <template v-else-if="state.view === 'cycle'"
        ><div class="sunny-question-head"><h1>もじは ぐるりと</h1></div>
        <ShiftBoard
          :input="state.index === 0 ? 'ん' : 'あ'"
          :output="shiftWord(state.index === 0 ? 'ん' : 'あ', state.shift)"
          :changed="state.shift !== 0"
        />
        <p class="sunny-letter-order">を → ん → あ → い</p></template
      >
      <template v-else-if="state.view === 'key'"
        ><div class="sunny-question-head">
          <h1>おくの とびらの おてほん</h1>
          <span class="sunny-target">あわせる もじ <strong>う</strong></span>
        </div>
        <ShiftBoard
          input="あ"
          :output="shiftWord('あ', state.shift)"
          :changed="state.shift > 0"
        />
        <p class="sunny-shift-note">うごいた かず：{{ state.shift }}つ</p>
        <p class="sunny-letter-order">あ → い → う</p></template
      >
      <template v-else-if="state.view === 'quiz'"
        ><div class="sunny-question-head">
          <h1>{{ q.title }}</h1>
          <span class="sunny-clue"
            >つくる おてほん
            <strong>{{ q.clue.original }} → {{ q.clue.changed }}</strong></span
          >
        </div>
        <ShiftBoard
          :input="q.input"
          :output="state.result"
          :changed="state.result !== null"
          :input-label="q.kind === 'decrypt' ? 'ひみつの もじ' : 'もとの もじ'"
          :output-label="
            q.kind === 'decrypt' ? 'よめた ことば' : 'かわった もじ'
          "
        />
        <div class="sunny-shift-note">
          {{
            q.kind === "prediction"
              ? "まだ うごかさずに かんがえよう"
              : state.direction
                ? shiftDescription
                : "よむ ときは、はんたいに うごかすよ"
          }}
        </div></template
      >
      <template v-else-if="state.view === 'nap'"
        ><div class="sunny-conversation">
          <small>ルゥ</small>
          <h1>いい ひなた。</h1>
          <p>
            {{
              saveAvailable
                ? "おひるねずかんに ばしょが ふえたよ。"
                : "ルゥが ねどこを みつけたよ。"
            }}
          </p>
          <button
            class="museum-button museum-button--small"
            @click="open('facts')"
          >
            ほんとうのこと・ゲームの くふう
          </button>
        </div></template
      >
      <template v-else
        ><div class="sunny-conversation">
          <small>みつけた しくみ {{ state.index + 1 }} / 3</small>
          <h1>{{ lessons[state.index] }}</h1>
          <div class="sunny-lesson-example">
            {{ ["ねこ → はし", "はし → ねこ", "ん → あ"][state.index] }}
          </div>
        </div></template
      >
    </section>
    <footer class="sunny-controls">
      <div class="sunny-guide" role="status" aria-live="polite">
        <span class="sunny-guide-symbol" aria-hidden="true">{{
          state.correct
            ? "✦"
            : state.view === "practice" && state.index === 0 && !state.correct
              ? "☟"
              : "◇"
        }}</span>
        <p>{{ state.view === "intro" ? "つぎへで すすもう。" : message }}</p>
      </div>
      <div class="sunny-main-actions">
        <button
          v-if="
            waiting ||
            state.view === 'intro' ||
            state.view === 'nap' ||
            (state.view === 'lesson' && state.index < 2)
          "
          class="museum-button museum-button--gold"
          :disabled="!active && !waiting"
          @click="send({ type: 'next' })"
        >
          {{ text.next }}
        </button>
        <NuxtLink
          v-else-if="state.view === 'lesson'"
          to="/"
          class="museum-button museum-button--gold"
          >はくぶつかんへ</NuxtLink
        >
        <template v-else-if="state.view === 'practice'"
          ><button
            class="museum-button"
            :disabled="!active || state.shift <= p.min"
            @click="send({ type: 'shift', amount: -1 })"
          >
            {{ text.back }}</button
          ><button
            v-if="state.index > 0"
            class="museum-button"
            :disabled="!active || state.shift >= p.max"
            @click="send({ type: 'shift', amount: 1 })"
          >
            {{ text.forward }}
          </button></template
        >
        <button
          v-else-if="state.view === 'cycle'"
          class="museum-button"
          :disabled="!active"
          @click="send({ type: 'shift', amount: state.index === 0 ? 1 : -1 })"
        >
          {{ state.index === 0 ? text.forward : text.back }}
        </button>
        <button
          v-else-if="state.view === 'key'"
          class="museum-button"
          :disabled="!active"
          @click="send({ type: 'shift', amount: 1 })"
        >
          {{ text.forward }}
        </button>
        <template v-else-if="q.kind === 'prediction'"
          ><div
            class="sunny-prediction-choices"
            role="radiogroup"
            aria-label="かわる もじ"
          >
            <button
              v-for="letter in q.choices"
              :key="letter"
              role="radio"
              :aria-checked="state.prediction === letter"
              class="sunny-choice"
              :disabled="!active"
              @click="send({ type: 'predict', letter })"
            >
              {{ letter }}
            </button>
          </div>
          <button
            class="museum-button museum-button--gold"
            :disabled="!canSubmit(state)"
            @click="send({ type: 'submit' })"
          >
            たしかめる
          </button></template
        >
        <template v-else-if="state.control === 'direction'"
          ><div
            role="radiogroup"
            aria-label="うごかす むき"
            class="sunny-direction-choices"
          >
            <button
              role="radio"
              :aria-checked="state.direction === 'back'"
              class="museum-button"
              :disabled="!active"
              @click="send({ type: 'direction', direction: 'back' })"
            >
              もどす</button
            ><button
              role="radio"
              :aria-checked="state.direction === 'forward'"
              class="museum-button"
              :disabled="!active"
              @click="send({ type: 'direction', direction: 'forward' })"
            >
              すすめる
            </button>
          </div></template
        >
        <template v-else-if="state.control === 'number'"
          ><div class="sunny-number-choices">
            <button
              class="sunny-number-button"
              aria-label="かずを 1つ へらす"
              :disabled="!active"
              @click="send({ type: 'amount', amount: state.amount - 1 })"
            >
              −</button
            ><output>{{ state.amount }}</output
            ><button
              class="sunny-number-button"
              aria-label="かずを 1つ ふやす"
              :disabled="!active"
              @click="send({ type: 'amount', amount: state.amount + 1 })"
            >
              ＋
            </button>
          </div>
          <button
            class="museum-button museum-button--gold"
            :disabled="!active"
            @click="send({ type: 'control-next' })"
          >
            つぎへ
          </button></template
        >
        <template v-else
          ><button
            class="museum-button museum-button--gold"
            :disabled="!canSubmit(state)"
            @click="send({ type: 'submit' })"
          >
            やってみる
          </button></template
        >
      </div>
      <div class="sunny-tools">
        <button
          v-if="
            state.view === 'quiz' &&
            q.kind !== 'prediction' &&
            state.control !== 'direction' &&
            active
          "
          class="sunny-tool"
          @click="send({ type: 'control-back' })"
        >
          えらびなおす</button
        ><button v-else class="sunny-tool" @click="open('order')">
          {{ text.order }}</button
        ><button
          v-if="['practice', 'quiz'].includes(state.view)"
          class="sunny-tool"
          :disabled="!active"
          @click="hint"
        >
          ヒント{{
            state.hint >= 0 && state.view === "quiz"
              ? ` ${state.hint + 1}/3`
              : ""
          }}</button
        ><button v-else class="sunny-tool" @click="open('help')">
          あそびかた
        </button>
      </div>
    </footer>
    <dialog ref="dialog" class="museum-dialog" @close="closed">
      <div class="museum-dialog-head">
        <h2>
          {{
            modal === "menu"
              ? "メニュー"
              : modal === "order"
                ? "もじの ならび"
                : modal === "restart"
                  ? "さいしょから？"
                  : modal === "demo"
                    ? "やりかたを みる"
                    : modal === "facts"
                      ? "てんじの おはなし"
                      : "あそびかた"
          }}
        </h2>
        <button class="museum-button museum-button--small" @click="close">
          とじる
        </button>
      </div>
      <template v-if="modal === 'menu'"
        ><nav class="museum-menu-links">
          <NuxtLink to="/">はくぶつかんへ</NuxtLink
          ><NuxtLink to="/dinosaur">もりランで あそぶ</NuxtLink
          ><NuxtLink to="/naps">おひるねずかん</NuxtLink
          ><button class="museum-button" @click="modal = 'restart'">
            さいしょから あそぶ</button
          ><button class="museum-button" @click="modal = 'help'">
            あそびかた</button
          ><button class="museum-button" @click="modal = 'facts'">
            ほんとうのこと・ゲームの くふう
          </button>
        </nav>
        <p v-if="!saveAvailable">
          きろくを のこせないけれど、このまま あそべるよ。
        </p>
        <NuxtLink to="/about" class="museum-text-link"
          >おとなの かたへ・しりょう</NuxtLink
        ></template
      >
      <KanaOrder v-else-if="modal === 'order'" />
      <template v-else-if="modal === 'help'"
        ><p>ボタンで、もじを ひとつずつ うごかすよ。</p>
        <p>ぜんぶの もじが、いっしょに うごくよ。</p>
        <p>おびを みぎへ ひくと もどす。ひだりへ ひくと すすめる。</p>
        <p>
          キーボードは、タブで えらんで エンター。おびでは みぎキーで
          もどす、ひだりキーで すすめる。
        </p>
        <button class="museum-button" @click="modal = 'order'">
          もじの ならびを みる
        </button></template
      >
      <template v-else-if="modal === 'restart'"
        ><p>おひるねずかんは、そのまま のこるよ。</p>
        <button class="museum-button" @click="restart">
          さいしょから あそぶ
        </button></template
      >
      <template v-else-if="modal === 'demo'"
        ><p>
          {{
            q.shift < 0
              ? "よむ ときは、もとに もどそう。"
              : "おなじ かず、すすめよう。"
          }}
        </p>
        <ShiftBoard
          :input="q.input[0]!"
          :output="demoLetter"
          :changed="demoAmount > 0"
        />
        <p>{{ demoAmount }}つ {{ q.shift < 0 ? "もどした" : "すすめた" }}</p>
        <button
          class="museum-button"
          :disabled="demoAmount >= Math.abs(q.shift)"
          @click="demoStep++"
        >
          {{ q.shift < 0 ? text.back : text.forward }}
        </button>
        <p>とじると、もとの もんだいへ もどるよ。</p></template
      >
      <template v-else
        ><h3>ほんとうのこと</h3>
        <p>{{ history.fact }}</p>
        <p>{{ history.cipher }}</p>
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
