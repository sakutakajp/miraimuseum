<script setup lang="ts">
import { KANA, wrapShift, shiftWord } from "~/games/caesar/cipher";
import { childCopy as text, introLines, bridgeLines, endingLines } from "~/games/caesar/adventure-copy";
import { readProgress, saveProgress } from "~/games/caesar/progress";
import { createNarrator, type VoiceStatus } from "~/games/caesar/narration";
import { GAME_SAVE_KEY, savedGameResult } from "~/games/progress";
import { bridgePuzzles, questions } from "~/games/caesar/questions";
import { bridgeWord, canExecute, createState, editable, repairWord, transition, type Action } from "~/games/caesar/state";
import type { WorldState } from "~/games/caesar/scene";
import LetterBands from "./LetterBands.vue";
import CharacterPortrait from "./CharacterPortrait.vue";
import KanaOrder from "./KanaOrder.vue";
import RuinWorld from "./RuinWorld.client.vue";
import StudyReview from "./StudyReview.vue";

const state = ref(createState());
const storageAvailable = ref(true);
const lightQuality = ref(false);
const voiceStatus = ref<VoiceStatus>("unavailable");
const soundOn = ref(true);
const renderer = ref("loading");
const visualReason = ref("");
const worldRef = ref<InstanceType<typeof RuinWorld>>();
const heading = ref<HTMLElement>();
const dialog = ref<HTMLDialogElement>();
const dialogPage = ref<"menu" | "order" | "help" | "parents" | "restart">("menu");
const receiverStep = ref(0);
const timers = new Set<ReturnType<typeof setTimeout>>();
let narrator: ReturnType<typeof createNarrator> | undefined;
let reducedMotion = false;
let dialogOpen = false;
let previousFocus: HTMLElement | null = null;
let focusTimer: ReturnType<typeof setTimeout> | undefined;
const puzzle = computed(() => bridgePuzzles[state.value.bridgeIndex]!);
const word = computed(() => bridgeWord(state.value));
const question = computed(() => questions[state.value.questionIndex]!);
const candidate = computed(() => repairWord(state.value));
const locked = computed(() => !editable(state.value));
const solved = computed(() => state.value.phase === "celebrating" || state.value.phase === "waiting");
const isConversation = computed(() => ["intro", "bridge-story", "machine-intro", "ending"].includes(state.value.view));
const conversation = computed(() => {
  const s = state.value;
  if (s.view === "intro") return introLines[s.storyIndex]!;
  if (s.view === "bridge-story") return { actor: "koro" as const, text: bridgeLines[s.storyIndex]! };
  if (s.view === "machine-intro") return { actor: "koro" as const, text: text.machineIntro };
  return { actor: s.storyIndex === 0 ? "mii" as const : "koro" as const, text: endingLines[s.storyIndex]! };
});
const tutorialPosition = computed(() => state.value.tutorialStep < 4 ? state.value.tutorialStep : 7 - state.value.tutorialStep);
const selection = computed(() => `${state.value.amount}つ ${state.value.direction === "forward" ? "すすめる" : "もどす"}`);
const world = computed<WorldState>(() => {
  const s = state.value;
  const atHome = s.view === "ending" || s.view === "complete";
  const bridgeScene = ["intro", "bridge", "bridge-story"].includes(s.view);
  return { stage: bridgeScene ? 1 : 2, bridgeSolved: s.view === "bridge-story" || (s.view === "bridge" && s.bridgeIndex === 3 && solved.value),
    repaired: s.repaired, complete: s.repaired === 3, atHome,
    footsteps: s.view === "bridge" ? Math.min(3, s.bridgeIndex + (solved.value ? 1 : 0)) : 0,
    happy: solved.value || atHome, word: s.view === "bridge" ? word.value : "", practice: s.view === "bridge" && s.bridgeIndex < 3 };
});
const progressLabel = computed(() => {
  const s = state.value;
  if (s.view === "bridge") return s.bridgeIndex < 3 ? `れんしゅう ${s.bridgeIndex + 1}/3` : "はしを なおそう";
  if (s.view === "tutorial") return "おてがみの れんしゅう";
  if (s.view === "machine") return question.value.id === "door" ? "さいごの とびら" : `なおす ${s.questionIndex + 1}/3`;
  if (s.view === "ending" || s.view === "complete") return "ミイの おうち";
  return "ミイと ぼうけん";
});
const guide = computed(() => {
  const s = state.value;
  if (isConversation.value) return "よんだら『つぎへ』を おしてね";
  if (s.view === "complete") return "ミイと あそんでくれて ありがとう！";
  if (s.view === "bridge") return solved.value ? puzzle.value.success : s.hintIndex >= 0 ? puzzle.value.hint : puzzle.value.instruction;
  if (s.view === "tutorial") return s.tutorialStep >= 4 ? text.reverse : s.tutorialStep === 0 ? "まだ うごいていないよ。0かいだね" : `${s.tutorialStep}かい うごいたよ`;
  if (solved.value) return question.value.success;
  if (s.hintIndex >= 0) return question.value.hints[s.hintIndex]!;
  if (s.phase === "incorrect") return text.wrong;
  if (s.phase === "executing") return "どんな もじに なるかな？";
  if (question.value.id === "repair") return s.selectedLetter === null ? text.repairIntro : "えらんだ もじだけ うごかそう";
  if (s.controlStep === "direction") return text.direction;
  if (s.controlStep === "number") return text.number;
  return `『${selection.value}』で やってみよう`;
});
const spokenText = computed(() => isConversation.value ? conversation.value.text : state.value.view === "machine" && state.value.controlStep === "direction" && !solved.value && state.value.hintIndex < 0 ? `${question.value.instruction}。${guide.value}` : guide.value);
const mayNext = computed(() => isConversation.value || state.value.view === "tutorial" || solved.value);
const nextDisabled = computed(() => state.value.phase === "entering" || state.value.phase === "celebrating");
const hintAvailable = computed(() => (state.value.view === "bridge" && state.value.bridgeIndex > 0 || state.value.view === "machine") && editable(state.value));

function later(callback: () => void, delay: number) {
  const timer = setTimeout(() => { timers.delete(timer); callback(); }, delay);
  timers.add(timer);
}
function cancelTimers() { timers.forEach(clearTimeout); timers.clear(); }
function schedulePhase() {
  if (state.value.phase === "entering") later(() => dispatch({ type: "ready" }), 420);
  if (state.value.phase === "executing") later(() => dispatch({ type: "resolve" }), reducedMotion ? 40 : 220);
  if (state.value.phase === "celebrating") {
    const bridge = state.value.view === "bridge";
    const sending = state.value.view === "machine" && question.value.id === "encrypt";
    if (sending) {
      receiverStep.value = 0;
      for (let i = 1; i <= 3; i++) later(() => { receiverStep.value = i; }, reducedMotion ? 40 : i * 350);
    }
    later(() => dispatch({ type: "settle" }), reducedMotion ? 100 : bridge && state.value.bridgeIndex === 3 ? 1800 : sending ? 1400 : 750);
  }
}
function persist() {
  try { storageAvailable.value = saveProgress(localStorage, state.value.progress); }
  catch { storageAvailable.value = false; }
}
function saveMuseumClear(stage: 1 | 2) {
  try { localStorage.setItem(GAME_SAVE_KEY, savedGameResult(localStorage.getItem(GAME_SAVE_KEY), { game: "rosetta", stage, cleared: true, score: 0, health: 1, elapsed: 0 })); }
  catch { storageAvailable.value = false; }
}
function dispatch(action: Action) {
  if (dialogOpen && !["ready", "settle", "resolve", "restart", "replay"].includes(action.type)) return;
  const previous = state.value;
  const next = transition(previous, action);
  if (next === previous) return;
  state.value = next;
  if (next.progress !== previous.progress) persist();
  if (!previous.progress.bridgeCleared && next.progress.bridgeCleared) saveMuseumClear(1);
  if (!previous.progress.doorCleared && next.progress.doorCleared) saveMuseumClear(2);
  if (next.phase !== previous.phase || action.type === "restart" || action.type === "replay") { cancelTimers(); schedulePhase(); }
  if (next.phase === "entering") {
    narrator?.stop();
    if (focusTimer) clearTimeout(focusTimer);
    focusTimer = setTimeout(() => { if (!dialogOpen) heading.value?.focus({ preventScroll: true }); }, 0);
  }
}
function act(action: Action) { narrator?.activate(); dispatch(action); }
function replaceStep(amount: number) {
  if (state.value.replacement) act({ type: "replace", letter: KANA[wrapShift(KANA.indexOf(state.value.replacement) + amount)]! });
}
function toggleSound() {
  soundOn.value = !soundOn.value;
  narrator?.activate(); narrator?.setEnabled(soundOn.value);
  try { localStorage.setItem("mirai-museum:caesar:sound", String(soundOn.value)); } catch { /* Optional preference. */ }
  if (soundOn.value) narrator?.speak(spokenText.value);
}
function repeat() { narrator?.activate(); narrator?.speak(spokenText.value); }
function openDialog(page: typeof dialogPage.value) {
  narrator?.stop();
  dialogPage.value = page;
  if (!dialogOpen) { previousFocus = document.activeElement as HTMLElement; dialogOpen = true; dialog.value?.showModal(); }
}
function closeDialog() {
  dialog.value?.close(); dialogOpen = false;
  previousFocus?.focus({ preventScroll: true });
}
function restart() { act({ type: "restart" }); closeDialog(); }
function visualStatus(status: string, reason: string) { renderer.value = status; visualReason.value = reason; }
watch(spokenText, value => { if (!dialogOpen) narrator?.speak(value); });
watch(() => state.value.controlStep, () => narrator?.stop(), { flush: "sync" });
onMounted(() => {
  reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  lightQuality.value = innerWidth < 700;
  try {
    const loaded = readProgress(localStorage); state.value = createState(loaded.progress); storageAvailable.value = loaded.available;
    soundOn.value = localStorage.getItem("mirai-museum:caesar:sound") !== "false";
  } catch { storageAvailable.value = false; }
  narrator = createNarrator({ synthesis: typeof speechSynthesis === "undefined" ? undefined : speechSynthesis,
    utterance: value => new SpeechSynthesisUtterance(value), status: status => { voiceStatus.value = status; } });
  narrator.setEnabled(soundOn.value);
  schedulePhase();
  document.addEventListener("visibilitychange", visibilityChanged);
});
function visibilityChanged() { if (document.hidden) narrator?.stop(); }
onBeforeUnmount(() => { cancelTimers(); if (focusTimer) clearTimeout(focusTimer); narrator?.dispose(); document.removeEventListener("visibilitychange", visibilityChanged); dialog.value?.close(); });
</script>

<template>
  <main lang="ja" class="caesar-adventure" :data-view="state.view" :data-phase="state.phase" :data-bridge-index="state.bridgeIndex" :data-question="question.id" :data-control="state.controlStep" :data-tutorial-step="state.tutorialStep">
    <header class="adventure-topbar">
      <div><span class="adventure-name">{{ text.title }}</span><span class="adventure-progress">{{ progressLabel }}</span></div>
      <button class="adventure-icon-button" :aria-label="soundOn ? 'おとを オフにする' : 'おとを オンにする'" :aria-pressed="soundOn" @click="toggleSound">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4Z" /><path v-if="soundOn && voiceStatus === 'ready'" d="M17 8q5 4 0 8" fill="none" /><path v-else d="m17 9 5 6m0-6-5 6" fill="none" /></svg>
      </button>
      <button class="adventure-icon-button" :aria-label="text.menu" @click="openDialog('menu')"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16" fill="none" /></svg></button>
    </header>

    <RuinWorld ref="worldRef" :state="world" :light="lightQuality" @status="visualStatus" />

    <section class="adventure-puzzle" :class="{ 'is-illuminated': state.phase === 'incorrect' || state.hintIndex >= 0 }" aria-labelledby="adventure-heading">
      <h1 id="adventure-heading" ref="heading" tabindex="-1" class="adventure-sr-only">{{ progressLabel }}</h1>
      <div v-if="isConversation" class="adventure-conversation">
        <CharacterPortrait :actor="conversation.actor" :happy="state.view === 'ending'" />
        <span>{{ conversation.actor === 'mii' ? 'ミイ' : 'コロ' }}</span>
        <p>{{ conversation.text }}</p>
      </div>

      <template v-else-if="state.view === 'bridge'">
        <div class="adventure-target"><span>おてほん</span><span class="adventure-target-icon" aria-hidden="true">{{ state.bridgeIndex === 2 ? '⌂' : state.bridgeIndex === 3 ? '' : '◇' }}</span><strong>{{ puzzle.expected }}</strong><CharacterPortrait v-if="state.bridgeIndex === 3" actor="mii" /></div>
        <LetterBands :key="state.bridgeIndex" :word="word" :disabled="locked || state.bridgeIndex === 0" @shift="act({ type: 'bridge-shift', shift: $event })" />
        <small class="adventure-original">はじめの もじ：{{ puzzle.input }}</small>
      </template>

      <template v-else-if="state.view === 'tutorial'">
        <p class="adventure-prompt">あ から え へ、いくつ うごく？</p>
        <div class="adventure-tutorial-path" :class="{ 'is-reversing': state.tutorialStep >= 4 }"><template v-for="(char, index) in 'あいうえ'" :key="char"><span :class="{ active: index === tutorialPosition, visited: index < tutorialPosition }">{{ char }}<small>{{ index }}</small></span><i v-if="index < 3" aria-hidden="true">{{ state.tutorialStep >= 4 ? '←' : '→' }}</i></template></div>
        <div class="adventure-count"><span>うごいた かず</span><strong>{{ tutorialPosition }}</strong><span>かい</span></div>
        <small>はじめの『あ』は 0かいだよ。</small>
      </template>

      <template v-else-if="state.view === 'machine'">
        <p class="adventure-prompt">{{ question.instruction }}</p>
        <div class="adventure-clue" :class="{ 'is-lit': state.phase === 'incorrect' || state.hintIndex >= 0 }">
          <span class="adventure-clue-title">てがかり</span>
          <div><small>もとの もじ</small><b>{{ question.clue.original }}</b></div><span aria-hidden="true">→</span><div><small>ひみつの もじ</small><b>{{ question.clue.encrypted }}</b></div>
        </div>
        <p v-if="question.source" class="adventure-source">もとの ことば：<strong>{{ question.source }}</strong></p>
        <div class="adventure-word-block"><span>{{ question.inputLabel }}</span>
          <div v-if="question.id === 'repair'" class="adventure-word adventure-word--select" role="group" aria-label="なおす もじを えらぶ"><button v-for="(char, index) in candidate" :key="index" :aria-label="`${index + 1}ばんめの もじ：${char}`" :aria-pressed="index === state.selectedLetter" :disabled="locked" @click="act({ type: 'select-letter', index })">{{ char }}</button></div>
          <div v-else class="adventure-word" :aria-label="`${question.inputLabel}：${question.input}`"><b v-for="(char, index) in question.input" :key="index">{{ char }}</b></div>
        </div>
        <div class="adventure-word-block adventure-result" :class="{ correct: solved }"><span>{{ question.resultLabel }}</span><div class="adventure-word" aria-live="polite" :aria-label="state.result === null ? 'やってみると もじが わかるよ' : `${question.resultLabel}：${state.result}`"><b v-for="(char, index) in state.result || '?'.repeat(question.input.length)" :key="index">{{ char === '?' ? '？' : char }}</b></div></div>
        <div v-if="question.id === 'encrypt' && solved" class="adventure-receiver" aria-label="おうちでも もとに もどす">おうちで：<strong>{{ shiftWord(question.expected, -receiverStep) }}</strong><span aria-hidden="true"> → </span><strong v-if="receiverStep === 3">よめた！</strong></div>
      </template>

      <div v-else class="adventure-conversation adventure-home"><CharacterPortrait actor="mii" happy /><span aria-hidden="true">⌂</span><p>ミイと いっしょに<br />おうちに ついたね！</p></div>
    </section>

    <section class="adventure-controls" aria-label="あそぶ ボタン">
      <div class="adventure-guide" role="status"><CharacterPortrait :actor="solved && state.view === 'bridge' ? 'mii' : 'koro'" :happy="solved" /><p>{{ guide }}</p></div>
      <div class="adventure-main-actions">
        <button v-if="mayNext" class="adventure-button adventure-button--primary" :disabled="nextDisabled" @click="act({ type: 'next' })">{{ state.view === 'tutorial' && state.tutorialStep < 7 ? state.tutorialStep < 3 ? text.forward : state.tutorialStep === 3 ? text.next : text.back : text.next }}</button>
        <template v-else-if="state.view === 'bridge'">
          <button class="adventure-button" :class="{ 'is-guided': state.bridgeIndex === 0 || state.hintIndex >= 0 }" :disabled="locked" @click="act({ type: 'bridge-shift', shift: -1 })"><span>{{ text.back }}</span><small>い → あ</small><span v-if="state.bridgeIndex === 0" class="adventure-hand" aria-hidden="true">☟</span></button>
          <button v-if="state.bridgeIndex > 0" class="adventure-button" :disabled="locked" @click="act({ type: 'bridge-shift', shift: 1 })"><span>{{ text.forward }}</span><small>あ → い</small></button>
        </template>
        <template v-else-if="state.view === 'machine'">
          <template v-if="question.id === 'repair'">
            <button class="adventure-button" :disabled="locked || state.selectedLetter === null" :aria-label="text.back" @click="replaceStep(-1)"><span>もどす</span><small>1つ</small></button>
            <button class="adventure-button" :disabled="locked || state.selectedLetter === null" :aria-label="text.forward" @click="replaceStep(1)"><span>すすめる</span><small>1つ</small></button>
            <button class="adventure-button adventure-button--primary" :disabled="!canExecute(state)" @click="act({ type: 'execute' })">{{ text.check }}</button>
          </template>
          <div v-else-if="state.controlStep === 'direction'" class="adventure-directions" role="group" aria-label="もどすか すすめるか えらぶ">
            <button class="adventure-button" :disabled="locked" :aria-pressed="state.direction === 'backward'" @click="act({ type: 'direction', direction: 'backward' })">もどす</button>
            <button class="adventure-button" :disabled="locked" :aria-pressed="state.direction === 'forward'" @click="act({ type: 'direction', direction: 'forward' })">すすめる</button>
          </div>
          <template v-else-if="state.controlStep === 'number'">
            <button class="adventure-button adventure-small-button" :disabled="locked" aria-label="むきを えらびなおす" @click="act({ type: 'control-back' })">むき</button>
            <div class="adventure-number"><button class="adventure-button" :disabled="locked" aria-label="かずを 1つ へらす" @click="act({ type: 'amount', amount: state.amount - 1 })">−</button><output aria-label="うごかす かず">{{ state.amount }}</output><button class="adventure-button" :disabled="locked" aria-label="かずを 1つ ふやす" @click="act({ type: 'amount', amount: state.amount + 1 })">＋</button></div>
            <button class="adventure-button adventure-button--primary adventure-small-button" :disabled="locked" @click="act({ type: 'control-next' })">{{ text.next }}</button>
          </template>
          <template v-else>
            <button class="adventure-button adventure-small-button" :disabled="locked" aria-label="かずを えらびなおす" @click="act({ type: 'control-back' })">かず</button>
            <button class="adventure-button adventure-button--primary" :disabled="!canExecute(state)" @click="act({ type: 'execute' })"><span>{{ text.run }}</span><small>{{ selection }}</small></button>
          </template>
        </template>
        <template v-else-if="state.view === 'complete'"><button class="adventure-button" :disabled="locked" @click="act({ type: 'replay' })">{{ text.again }}</button><NuxtLink class="adventure-button adventure-button--primary" to="/games">{{ text.finish }}</NuxtLink></template>
      </div>
      <div class="adventure-tools"><button @click="openDialog('order')">{{ text.order }}</button><button v-if="hintAvailable" @click="act({ type: 'hint' })">{{ text.hint }}</button><button v-else :disabled="voiceStatus !== 'ready' || !soundOn" @click="repeat">{{ text.repeat }}</button></div>
    </section>

    <dialog ref="dialog" class="adventure-dialog" aria-labelledby="adventure-dialog-title" @cancel.prevent="closeDialog" @close="dialogOpen = false">
      <div class="adventure-dialog-bar"><h2 id="adventure-dialog-title">{{ dialogPage === 'menu' ? text.menu : dialogPage === 'order' ? text.order : dialogPage === 'parents' ? 'おとなの かたへ' : dialogPage === 'restart' ? 'やりなおす？' : 'あそびかた' }}</h2><button class="adventure-button" aria-label="とじて あそびに もどる" @click="closeDialog">とじる</button></div>
      <div v-if="dialogPage === 'menu'" class="adventure-menu">
        <button class="adventure-button" @click="openDialog('order')">{{ text.order }}</button><button class="adventure-button" @click="openDialog('help')">あそびかた</button>
        <button class="adventure-button" :aria-pressed="soundOn" @click="toggleSound">おと：{{ soundOn ? 'オン' : 'オフ' }}</button><button class="adventure-button" :disabled="voiceStatus !== 'ready' || !soundOn" @click="repeat">{{ text.repeat }}</button>
        <p v-if="voiceStatus !== 'ready'">この きかいでは おとが つかえません。もじで あそべるよ。</p>
        <button class="adventure-button" @click="openDialog('restart')">この もんだいを やりなおす</button><button class="adventure-button" @click="openDialog('parents')">おとなの かたへ</button>
        <label class="adventure-quality">えの うごき<select v-model="lightQuality"><option :value="true">かるく</option><option :value="false">くわしく</option></select></label>
        <p v-if="renderer === 'fallback'">いまは イラストで あそべるよ。</p><button v-if="renderer === 'fallback'" class="adventure-button" @click="worldRef?.retry()">えの うごきを ためす</button>
        <NuxtLink class="adventure-button" to="/games">ゲームを おわる</NuxtLink>
      </div>
      <KanaOrder v-else-if="dialogPage === 'order'" />
      <div v-else-if="dialogPage === 'help'" class="adventure-help"><CharacterPortrait actor="koro" /><p>ボタンを おすと、もじが ひとつ うごくよ。</p><p>おびを みぎに ひくと もどる。ひだりに ひくと すすむよ。</p><p>キーボードでも、みぎキーで もどす。ひだりキーで すすめるよ。</p><p>わからない ときは『コロの ヒント』を おしてね。</p></div>
      <div v-else-if="dialogPage === 'restart'" class="adventure-help"><p>いまの もんだいを、はじめから あそぶ？</p><button class="adventure-button adventure-button--primary" @click="restart">やりなおす</button><button class="adventure-button" @click="closeDialog">あそびに もどる</button></div>
      <div v-else class="adventure-parents">
        <p>文字を同じ数だけずらす暗号の体験です。練習は記録に含めず、通信機の3問と、新しい鍵の「最後の扉」を分けて記録します。正解前に目標の言葉を明かすのは、橋の練習だけです。</p>
        <p>この遊びの暗号は、実際の大切な情報を守る用途には使わないでください。</p>
        <p>音声は端末の日本語音声を使うブラウザ音声合成です。録音素材は使っていません。音声がない端末でも遊べます。</p>
        <p v-if="!storageAvailable">この環境では記録を保存できません。遊びは続けられます。</p>
        <details v-if="renderer === 'fallback'"><summary>動きの表示について</summary><p>{{ visualReason }} イラストと画面の動きで進行します。</p></details>
        <StudyReview :progress="state.progress" />
      </div>
    </dialog>
  </main>
</template>
