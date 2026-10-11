<script setup lang="ts">
import ReadableText from "~/components/games/caesar/ReadableText.vue";
import { shiftWord } from "~/games/caesar/cipher";
import { copy } from "~/games/caesar/copy";

const props = defineProps<{ word: string; disabled: boolean; guide: boolean }>();
const emit = defineEmits<{ shift: [amount: number] }>();
const displacement = ref(0);
const dragging = ref(false);
const offsets = Array.from({ length: 11 }, (_, i) => i - 5);
let pointer: { id: number; x: number; y: number; cell: number; target: HTMLElement } | null = null;
function down(event: PointerEvent) {
  if (props.disabled || (event.pointerType === "mouse" && event.button !== 0) || pointer) return;
  const target = event.currentTarget as HTMLElement;
  target.focus({ preventScroll: true });
  pointer = { id: event.pointerId, x: event.clientX, y: event.clientY, cell: target.clientWidth / 5, target };
  target.setPointerCapture(event.pointerId);
}
function move(event: PointerEvent) {
  if (!pointer || pointer.id !== event.pointerId) return;
  const dx = event.clientX - pointer.x;
  const dy = event.clientY - pointer.y;
  if (!dragging.value && Math.abs(dx) < 8) return;
  if (!dragging.value && Math.abs(dy) > Math.abs(dx)) return;
  dragging.value = true;
  displacement.value = Math.max(-pointer.cell * 3, Math.min(pointer.cell * 3, dx));
}
function release(event: PointerEvent, cancelled = false) {
  if (!pointer || pointer.id !== event.pointerId) return;
  const shift = cancelled ? 0 : -Math.round(displacement.value / pointer.cell);
  const target = pointer.target;
  pointer = null;
  if (target.hasPointerCapture(event.pointerId)) target.releasePointerCapture(event.pointerId);
  dragging.value = false;
  displacement.value = 0;
  if (shift) emit("shift", shift);
}
function key(event: KeyboardEvent) {
  if (props.disabled) return;
  if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
    event.preventDefault();
    emit("shift", event.key === "ArrowRight" ? -1 : 1);
  }
}
function letter(row: number, offset: number) { return shiftWord(props.word[row]!, offset); }
onBeforeUnmount(() => { pointer = null; });
</script>

<template>
  <div class="caesar-bands" :class="{ 'is-dragging': dragging, 'is-locked': disabled }" :style="{ '--band-drag': `${displacement}px` }">
    <div class="caesar-bands__label"><ReadableText :text="copy.currentLetters" /><span aria-hidden="true">▾</span></div>
    <div class="caesar-bands__link" aria-hidden="true"><i v-for="i in 3" :key="i" /></div>
    <div class="caesar-bands__rows">
      <div v-for="(_, row) in word" :key="row" class="caesar-band" role="group"
        :tabindex="disabled ? -1 : 0" :aria-label="`${copy.band(row + 1)}: ${word[row]}`" :aria-disabled="disabled"
        aria-describedby="band-instructions" @pointerdown="down" @pointermove="move"
        @pointerup="release($event)" @pointercancel="release($event, true)" @lostpointercapture="release($event, true)" @keydown="key">
        <div class="caesar-band__strip" aria-hidden="true"><span v-for="offset in offsets" :key="offset">{{ letter(row, offset) }}</span></div>
      </div>
      <div class="caesar-bands__selection" aria-hidden="true" />
    </div>
    <div v-if="guide && !dragging" class="caesar-drag-guide" aria-hidden="true"><span>☞</span>⟶</div>
    <p class="caesar-bands__instruction" id="band-instructions"><ReadableText :text="copy.dragInstruction" /><small><ReadableText :text="copy.keyboard" /></small></p>
    <span class="caesar-linked-label"><ReadableText :text="copy.linked" /></span>
  </div>
</template>
