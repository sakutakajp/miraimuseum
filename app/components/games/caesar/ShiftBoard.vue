<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    input: string;
    output: string | null;
    interactive?: boolean;
    changed?: boolean;
    inputLabel?: string;
    outputLabel?: string;
  }>(),
  { inputLabel: "もとの もじ", outputLabel: "かわった もじ" },
);
const emit = defineEmits<{ shift: [amount: number] }>();
let pointer: { id: number; x: number; y: number; target: HTMLElement } | null =
  null;
const drag = ref(0);
function clear() {
  if (pointer?.target.hasPointerCapture(pointer.id))
    pointer.target.releasePointerCapture(pointer.id);
  pointer = null;
  drag.value = 0;
}
function down(e: PointerEvent) {
  if (
    !props.interactive ||
    pointer ||
    (e.pointerType === "mouse" && e.button !== 0)
  )
    return;
  const target = e.currentTarget as HTMLElement;
  target.focus({ preventScroll: true });
  pointer = { id: e.pointerId, x: e.clientX, y: e.clientY, target };
  target.setPointerCapture(e.pointerId);
}
function move(e: PointerEvent) {
  if (
    pointer?.id === e.pointerId &&
    Math.abs(e.clientX - pointer.x) > Math.abs(e.clientY - pointer.y)
  )
    drag.value = Math.max(-120, Math.min(120, e.clientX - pointer.x));
}
function up(e: PointerEvent, cancel = false) {
  if (pointer?.id !== e.pointerId) return;
  const amount =
    cancel || !props.interactive ? 0 : -Math.round(drag.value / 60);
  clear();
  if (amount) emit("shift", amount);
}
function key(e: KeyboardEvent) {
  if (props.interactive && ["ArrowLeft", "ArrowRight"].includes(e.key)) {
    e.preventDefault();
    emit("shift", e.key === "ArrowRight" ? -1 : 1);
  }
}
watch(
  () => props.interactive,
  (value) => {
    if (!value) clear();
  },
);
onBeforeUnmount(clear);
</script>
<template>
  <div
    class="sunny-board"
    :class="{ 'sunny-board--changed': changed }"
    role="group"
    :tabindex="interactive ? 0 : -1"
    :aria-disabled="!interactive"
    aria-label="もとの もじと、かわった もじ"
    :style="{ '--board-drag': `${drag}px` }"
    @pointerdown="down"
    @pointermove="move"
    @pointerup="up($event)"
    @pointercancel="up($event, true)"
    @lostpointercapture="up($event, true)"
    @keydown="key"
  >
    <div class="sunny-board-labels">
      <span>{{ inputLabel }}</span
      ><span>{{ output === null ? "まだ ひみつ" : outputLabel }}</span>
    </div>
    <div class="sunny-board-pairs">
      <div v-for="(letter, i) in input" :key="i" class="sunny-letter-pair">
        <span class="sunny-letter sunny-letter--source">{{ letter }}</span
        ><span class="sunny-link-arrow" aria-hidden="true">↓</span
        ><span
          class="sunny-letter sunny-letter--output"
          :data-position="i + 1"
          >{{ output?.[i] ?? "？" }}</span
        >
      </div>
    </div>
    <span v-if="interactive" class="museum-sr-only"
      >みぎへ ひくと もどす。ひだりへ ひくと すすめる。みぎキーで
      もどす。ひだりキーで すすめる。</span
    >
  </div>
</template>
