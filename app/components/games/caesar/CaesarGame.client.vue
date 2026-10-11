<script setup lang="ts">
import ReadableText from "~/components/games/caesar/ReadableText.vue";
import { ALPHABET, shiftWord, wrap26 } from "~/games/caesar/cipher";
import { copy } from "~/games/caesar/copy";
import { readProgress, saveProgress } from "~/games/caesar/progress";
import { GAME_SAVE_KEY, savedGameResult } from "~/games/progress";
import { questions } from "~/games/caesar/questions";
import { bridgeWord, canExecute, createState, editable, repairWord, transition, type Action } from "~/games/caesar/state";
import type { WorldState } from "~/games/caesar/scene";
import LetterBands from "./LetterBands.vue";
import RuinWorld from "./RuinWorld.client.vue";
import StudyReview from "./StudyReview.vue";

const state = ref(createState());
const storageAvailable = ref(true);
const lightQuality = ref(false);
const trace = ref(["FDW"]);
const questionHeading = ref<HTMLElement>();
const timers = new Set<ReturnType<typeof setTimeout>>();
let reducedMotion = false;
const word = computed(() => bridgeWord(state.value));
const question = computed(() => questions[state.value.questionIndex]!);
const currentRecord = computed(() => state.value.progress.records[question.value.id]);
const locked = computed(() => !editable(state.value));
const repaired = computed(() => Object.values(state.value.progress.records).filter(record => record.solved).length);
const world = computed<WorldState>(() => ({
  stage: state.value.view === "bridge" || state.value.view === "menu" ? 1 : 2,
  bridgeSolved: state.value.view === "bridge" && state.value.progress.bridgeCleared && locked.value,
  repaired: repaired.value, complete: state.value.view === "complete",
}));
const stageNumber = computed(() => world.value.stage);
const bridgeMessage = computed(() => locked.value ? copy.bridgeConnected : !state.value.guideDone ? copy.dragGuide : state.value.bridgeShift === 25 ? copy.oneBack : copy.bridgeGoal);
const equivalent = computed(() => state.value.correct && state.value.amount === 23 ? (question.value.id === "decrypt" ? copy.equivalentBack : copy.equivalentForward) : "");
const wrongMessage = computed(() => question.value.id === "repair" ? copy.repairHint : question.value.id === "decrypt" && state.value.direction === "forward" && state.value.amount === 3 ? copy.reverseHint : copy.retryHint);
const candidate = computed(() => repairWord(state.value));
const hasReview = computed(() => Object.values(state.value.progress.records).some(record => record.attempts > 0 || record.hints > 0));

function later(action: Action, delay: number) {
  const timer = setTimeout(() => { timers.delete(timer); dispatch(action); }, reducedMotion ? 40 : delay);
  timers.add(timer);
}
function cancelTimers() { timers.forEach(clearTimeout); timers.clear(); }
function persist() {
  try { storageAvailable.value = saveProgress(localStorage, state.value.progress); }
  catch { storageAvailable.value = false; }
}
function saveMuseumClear(stage: 1 | 2) {
  try {
    localStorage.setItem(GAME_SAVE_KEY, savedGameResult(localStorage.getItem(GAME_SAVE_KEY), {
      game: "rosetta", stage, cleared: true, score: 0, health: 1, elapsed: 0,
    }));
  } catch { storageAvailable.value = false; }
}
function dispatch(action: Action) {
  if (action.type === "start" || action.type === "menu") { cancelTimers(); trace.value = ["FDW"]; }
  const previous = state.value;
  state.value = transition(previous, action);
  if (state.value.progress !== previous.progress) persist();
  if (state.value.view === "bridge" && state.value.phase === "celebrating" && previous.phase !== "celebrating") saveMuseumClear(1);
  if (state.value.view === "complete" && previous.view !== "complete") saveMuseumClear(2);
  if (state.value.phase === "executing" && previous.phase !== "executing") later({ type: "resolve" }, 240);
  if (state.value.phase === "celebrating" && previous.phase !== "celebrating") later({ type: "settle" }, state.value.view === "bridge" ? 3300 : 950);
  if (action.type === "next" || action.type === "start") nextTick(() => questionHeading.value?.focus({ preventScroll: true }));
}
function shiftBridge(amount: number) {
  if (locked.value) return;
  // Keep every intermediate word visible in the history, including multi-cell drags.
  for (let i = 1; i <= Math.abs(amount); i++) {
    trace.value.push(shiftWord("FDW", state.value.bridgeShift + Math.sign(amount) * i));
  }
  trace.value = trace.value.slice(-8);
  dispatch({ type: "bridge-shift", shift: amount });
}
function replaceStep(amount: number) {
  if (state.value.replacement) dispatch({ type: "replace", letter: ALPHABET[wrap26(ALPHABET.indexOf(state.value.replacement) + amount)]! });
}
function replacementChanged(event: Event) { dispatch({ type: "replace", letter: (event.target as HTMLSelectElement).value }); }
onMounted(() => {
  reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  lightQuality.value = innerWidth < 700;
  try {
    const loaded = readProgress(localStorage);
    state.value = createState(loaded.progress);
    storageAvailable.value = loaded.available;
  } catch { storageAvailable.value = false; }
});
onBeforeUnmount(cancelTimers);
</script>

<template>
  <main class="caesar" :data-view="state.view" :data-phase="state.phase">
    <header class="caesar-topbar">
      <NuxtLink to="/games" class="caesar-brand">MIRAI <span>MUSEUM</span></NuxtLink>
      <nav :aria-label="copy.games"><NuxtLink to="/games" :aria-label="`← ${copy.games}`">← <ReadableText :text="copy.games" /></NuxtLink><button :aria-label="copy.chooseStage" v-if="state.view !== 'menu'" @click="dispatch({ type: 'menu' })"><ReadableText :text="copy.chooseStage" /></button></nav>
    </header>

    <RuinWorld :state="world" :light="lightQuality">
      <div class="caesar-world__heading"><span class="caesar-eyebrow">THE CIPHER RUINS <i /> STAGE 0{{ stageNumber }}</span><h1 :aria-label="state.view === 'complete' ? copy.title : stageNumber === 1 ? copy.stage1 : copy.stage2"><ReadableText :text="state.view === 'complete' ? copy.title : stageNumber === 1 ? copy.stage1 : copy.stage2" /></h1><div class="caesar-title-rule"><span>◇</span></div></div>
      <template v-if="state.view === 'bridge'">
        <div class="caesar-world__letters" :class="{ solved: locked }" :aria-label="`${copy.bridgeLetters}: ${word}`"><span v-for="(letter, index) in word" :key="index">{{ letter }}</span></div>
        <div class="caesar-world__goal"><ReadableText :text="copy.catHint" /></div>
      </template>
      <div v-else-if="state.view === 'machine'" class="caesar-world__repair"><span v-for="n in 3" :key="n" :class="{ active: n <= repaired }" aria-hidden="true">◇</span><small><ReadableText :text="copy.repairedCount(repaired)" /></small></div>
      <label class="caesar-quality"><ReadableText :text="copy.quality" /><select v-model="lightQuality"><option :value="false">{{ copy.standard }}</option><option :value="true">{{ copy.light }}</option></select></label>
    </RuinWorld>

    <section v-if="state.view === 'bridge'" class="caesar-console caesar-console--bridge" aria-labelledby="bridge-prompt">
      <div class="caesar-console__corners" aria-hidden="true" />
      <div class="caesar-console__heading"><span class="caesar-eyebrow">01 / DISCOVER THE KEY</span><h2 :aria-label="bridgeMessage" id="bridge-prompt" ref="questionHeading" tabindex="-1"><ReadableText :text="bridgeMessage" /></h2></div>
      <div class="caesar-original"><span><ReadableText :text="copy.originalCipher" /></span><div class="caesar-word caesar-word--gold"><b v-for="(letter, index) in 'FDW'" :key="index">{{ letter }}</b></div></div>
      <div class="caesar-bridge-controls">
        <LetterBands :word="word" :disabled="locked" :guide="!state.guideDone" @shift="shiftBridge" />
        <aside class="caesar-bridge-readout"><div><span><ReadableText :text="copy.backCount" /></span><strong data-testid="back-count">{{ wrap26(-state.bridgeShift) }}</strong></div><div><span><ReadableText :text="copy.output" /></span><output class="caesar-readout-word" data-testid="bridge-output" aria-live="polite">{{ word }}</output></div></aside>
      </div>
      <div class="caesar-bridge-bottom"><div class="caesar-trace"><small><ReadableText :text="copy.trace" /></small><p><template v-for="(entry, index) in trace" :key="index"><span v-if="index" aria-hidden="true">→</span><b>{{ entry }}</b></template></p></div><div class="caesar-button-pair"><button :aria-label="`↶ ${copy.backOne}`" class="caesar-button" :disabled="locked" @click="shiftBridge(-1)">↶ <ReadableText :text="copy.backOne" /></button><button :aria-label="`${copy.forwardOne} ↷`" class="caesar-button" :disabled="locked" @click="shiftBridge(1)"><ReadableText :text="copy.forwardOne" /> ↷</button></div></div>
      <div v-if="locked" class="caesar-feedback success" role="status"><strong><ReadableText :text="copy.bridgeConnected" /></strong><p><ReadableText :text="copy.bridgeSuccess" /></p><p><ReadableText :text="copy.keyLesson" /></p><button :aria-label="`${copy.toMachine} →`" v-if="state.phase === 'waiting'" class="caesar-button caesar-button--primary" @click="dispatch({ type: 'start', stage: 2 })"><ReadableText :text="copy.toMachine" /> →</button></div>
      <p v-else class="caesar-footnote"><ReadableText :text="copy.cycle" /></p>
      <div class="caesar-footer"><span><ReadableText :text="copy.noTimer" /></span><button :aria-label="copy.restart" class="caesar-link-button" @click="dispatch({ type: 'start', stage: 1 })"><ReadableText :text="copy.restart" /></button></div>
    </section>

    <section v-else-if="state.view === 'machine'" class="caesar-console caesar-console--machine" aria-labelledby="question-title">
      <div class="caesar-console__corners" aria-hidden="true" />
      <div class="caesar-console__heading"><span class="caesar-eyebrow">02 / REPAIR THE SIGNAL <span class="caesar-question-count">{{ state.questionIndex + 1 }} / 3</span></span><h2 :aria-label="question.title" id="question-title" ref="questionHeading" tabindex="-1"><ReadableText :text="question.title" /></h2></div>
      <div class="caesar-machine-panels">
        <aside class="caesar-record"><h3>◇ <ReadableText :text="copy.records" /> ◇</h3><div class="caesar-record__labels"><span><ReadableText :text="copy.originalLetter" /></span><span><ReadableText :text="copy.cipherLetter" /></span></div><div class="caesar-record__letters"><b>{{ question.clue.original }}</b><span aria-hidden="true">→</span><b>{{ question.clue.encrypted }}</b></div></aside>
        <div class="caesar-message-panel">
          <template v-if="question.id === 'repair'"><h3><ReadableText :text="copy.sourceWord" /></h3><div class="caesar-word caesar-word--source"><b v-for="(letter, index) in question.source" :key="index">{{ letter }}</b></div></template>
          <h3><ReadableText :text="question.inputLabel" /></h3>
          <div v-if="question.id !== 'repair'" class="caesar-word caesar-word--stone"><b v-for="(letter, index) in question.input" :key="index">{{ letter }}</b></div>
          <div v-else class="caesar-word caesar-word--repair"><button v-for="(letter, index) in candidate" :key="index" :aria-label="copy.repairSlot(index, question.input[index]!)" :aria-pressed="state.selectedLetter === index" :disabled="locked" @click="dispatch({ type: 'select-letter', index })">{{ letter }}</button></div>
          <h3 class="caesar-result-label"><ReadableText :text="question.resultLabel" /></h3><output class="caesar-word caesar-word--result" data-testid="machine-result" :aria-label="question.resultLabel"><b v-for="(letter, index) in state.result || '???'" :key="index">{{ letter }}</b></output>
        </div>
      </div>
      <p class="caesar-instruction"><ReadableText :text="question.instruction" /></p>
      <div v-if="question.id !== 'repair'" class="caesar-machine-controls">
        <fieldset class="caesar-direction"><legend><ReadableText :text="copy.direction" /></legend><div><button :aria-label="`« ${copy.backward}`" class="caesar-button" :aria-pressed="state.direction === 'backward'" :disabled="locked" @click="dispatch({ type: 'direction', direction: 'backward' })">« <ReadableText :text="copy.backward" /></button><button :aria-label="`${copy.forward} »`" class="caesar-button" :aria-pressed="state.direction === 'forward'" :disabled="locked" @click="dispatch({ type: 'direction', direction: 'forward' })"><ReadableText :text="copy.forward" /> »</button></div></fieldset>
        <fieldset class="caesar-stepper"><legend><ReadableText :text="copy.shift" /></legend><div><button :aria-label="copy.decrease" :disabled="locked" @click="dispatch({ type: 'amount', amount: state.amount - 1 })">−</button><output data-testid="shift-amount">{{ state.amount }}</output><button :aria-label="copy.increase" :disabled="locked" @click="dispatch({ type: 'amount', amount: state.amount + 1 })">＋</button></div></fieldset>
        <div class="caesar-execute"><button :aria-label="copy.execute" class="caesar-button caesar-button--primary" :disabled="!canExecute(state)" @click="dispatch({ type: 'execute' })"><ReadableText :text="copy.execute" /> <span aria-hidden="true">◇</span></button><small><ReadableText :text="state.direction === null ? copy.chooseDirection : copy.hiddenResult" /></small></div>
      </div>
      <div v-else class="caesar-machine-controls caesar-machine-controls--repair">
        <p><ReadableText :text="copy.repairInstruction" /></p><fieldset class="caesar-stepper"><legend><ReadableText :text="copy.replacement" /></legend><div><button :aria-label="copy.previousLetter" :disabled="locked || state.selectedLetter === null" @click="replaceStep(-1)">−</button><select :value="state.replacement || ''" :aria-label="copy.selectReplacement" :disabled="locked || state.selectedLetter === null" @change="replacementChanged"><option disabled value="">—</option><option v-for="letter in ALPHABET" :key="letter" :value="letter">{{ letter }}</option></select><button :aria-label="copy.nextLetter" :disabled="locked || state.selectedLetter === null" @click="replaceStep(1)">＋</button></div></fieldset>
        <div class="caesar-execute"><button :aria-label="`${copy.check} ◇`" class="caesar-button caesar-button--primary" :disabled="!canExecute(state)" @click="dispatch({ type: 'execute' })"><ReadableText :text="copy.check" /> ◇</button><small><ReadableText :text="state.selectedLetter === null ? copy.chooseLetter : copy.hiddenResult" /></small></div>
      </div>
      <div class="caesar-feedback" :class="{ success: state.correct, incorrect: state.correct === false }" role="status" aria-live="polite" aria-atomic="true">
        <p v-if="state.phase === 'executing'"><ReadableText :text="copy.executing" /></p>
        <template v-else-if="state.correct"><strong>✓ <ReadableText :text="copy.correct" /></strong><p><ReadableText :text="question.success" /></p><p v-if="equivalent"><ReadableText :text="equivalent" /></p><div v-if="question.id === 'encrypt'" class="caesar-letter-mapping"><span v-for="(letter, index) in question.input" :key="index" :style="{ '--mapping-delay': `${index * 160}ms` }">{{ letter }} → {{ state.result![index] }}</span></div><button :aria-label="`${state.questionIndex === 2 ? copy.finish : copy.next} →`" v-if="state.phase === 'waiting'" class="caesar-button caesar-button--primary" @click="dispatch({ type: 'next' })"><ReadableText :text="state.questionIndex === 2 ? copy.finish : copy.next" /> →</button></template>
        <template v-else-if="state.correct === false"><strong>↻ <ReadableText :text="copy.incorrect" /></strong><p><ReadableText :text="wrongMessage" /></p></template>
      </div>
      <div class="caesar-hints"><button :aria-label="`${currentRecord.hints >= 2 ? copy.hintsDone : copy.hint} ${copy.hintCount(currentRecord.hints)}`" class="caesar-link-button" :disabled="locked || currentRecord.hints >= question.hints.length" @click="dispatch({ type: 'hint' })">◇ <ReadableText :text="currentRecord.hints >= 2 ? copy.hintsDone : copy.hint" /> <small><ReadableText :text="copy.hintCount(currentRecord.hints)" /></small></button><ol v-if="currentRecord.hints"><li v-for="hint in question.hints.slice(0, currentRecord.hints)" :key="hint"><ReadableText :text="hint" /></li></ol></div>
      <div class="caesar-footer"><span><ReadableText :text="copy.noTimer" /></span><button :aria-label="copy.restart" class="caesar-link-button" @click="dispatch({ type: 'start', stage: 2 })"><ReadableText :text="copy.restart" /></button></div>
    </section>

    <section v-else-if="state.view === 'complete'" class="caesar-console caesar-complete">
      <span class="caesar-eyebrow">SIGNAL RESTORED</span><h2 :aria-label="copy.complete" ref="questionHeading" tabindex="-1"><ReadableText :text="copy.complete" /></h2><p><ReadableText :text="copy.completedDescription" /></p><ol class="caesar-lessons"><li v-for="(lesson, index) in copy.lessons" :key="lesson"><span>0{{ index + 1 }}</span><ReadableText :text="lesson" /></li></ol><StudyReview :progress="state.progress" /><div class="caesar-complete__actions"><button :aria-label="`${copy.replay} ↻`" class="caesar-button caesar-button--primary" @click="dispatch({ type: 'start', stage: 1 })"><ReadableText :text="copy.replay" /> ↻</button><button :aria-label="copy.chooseStage" class="caesar-button" @click="dispatch({ type: 'menu' })"><ReadableText :text="copy.chooseStage" /></button></div><p class="caesar-footnote"><ReadableText :text="copy.security" /></p>
    </section>

    <section v-else class="caesar-console caesar-stage-menu">
      <span class="caesar-eyebrow">EXPLORE THE RUINS</span><h2 ref="questionHeading" tabindex="-1"><ReadableText :text="copy.stages" /></h2><div class="caesar-stage-menu__grid"><button :aria-label="`STAGE 0${stage} ${stage === 1 ? copy.stage1 : copy.stage2}`" v-for="stage in ([1, 2] as const)" :key="stage" @click="dispatch({ type: 'start', stage })"><small>STAGE 0{{ stage }}</small><h3><ReadableText :text="stage === 1 ? copy.stage1 : copy.stage2" /></h3><p><ReadableText :text="stage === 1 ? copy.stage1Description : copy.stage2Description" /></p><span><ReadableText :text="(stage === 1 ? state.progress.bridgeCleared : state.progress.machineCleared) ? `✓ ${copy.stageCleared}` : '→'" /></span></button></div><StudyReview v-if="hasReview" :progress="state.progress" />
    </section>
    <footer class="caesar-page-footer"><span :role="storageAvailable ? undefined : 'status'"><ReadableText :text="storageAvailable ? copy.localOnly : copy.saveUnavailable" /></span><NuxtLink to="/games" :aria-label="`${copy.games} ↗`"><ReadableText :text="copy.games" /> ↗</NuxtLink></footer>
  </main>
</template>
