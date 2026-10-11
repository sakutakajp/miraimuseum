<script setup lang="ts">
import { shiftWord } from "~/games/caesar/cipher";
const props = defineProps<{ word: string; disabled: boolean }>();
const emit = defineEmits<{ shift: [amount: number] }>();
const displacement = ref(0);
const dragging = ref(false);
const offsets = [-3, -2, -1, 0, 1, 2, 3];
let pointer: { id: number; x: number; y: number; cell: number; target: HTMLElement } | null = null;
function clear() {
  if (pointer?.target.hasPointerCapture(pointer.id)) pointer.target.releasePointerCapture(pointer.id);
  pointer = null; displacement.value = 0; dragging.value = false;
}
function down(event: PointerEvent) {
  if (props.disabled || (event.pointerType === "mouse" && event.button !== 0) || pointer) return;
  const target = event.currentTarget as HTMLElement;
  target.focus({ preventScroll: true });
  const visible = Number(getComputedStyle(target).getPropertyValue("--visible-cells")) || 3;
  pointer = { id: event.pointerId, x: event.clientX, y: event.clientY, cell: target.clientWidth / visible, target };
  target.setPointerCapture(event.pointerId);
}
function move(event: PointerEvent) {
  if (!pointer || pointer.id !== event.pointerId) return;
  const dx = event.clientX - pointer.x, dy = event.clientY - pointer.y;
  if (!dragging.value && (Math.abs(dx) < 8 || Math.abs(dy) > Math.abs(dx))) return;
  dragging.value = true;
  displacement.value = Math.max(-pointer.cell * 2, Math.min(pointer.cell * 2, dx));
}
function release(event: PointerEvent, cancelled = false) {
  if (!pointer || pointer.id !== event.pointerId) return;
  const shift = cancelled || props.disabled ? 0 : -Math.round(displacement.value / pointer.cell);
  clear();
  if (shift) emit("shift", shift);
}
function key(event: KeyboardEvent) {
  if (!props.disabled && (event.key === "ArrowRight" || event.key === "ArrowLeft")) {
    event.preventDefault(); emit("shift", event.key === "ArrowRight" ? -1 : 1);
  }
}
watch(() => props.disabled, disabled => { if (disabled) clear(); });
onBeforeUnmount(clear);
</script>
<template>
  <div class="adventure-bands" :class="{ 'is-dragging': dragging }" :style="{ '--band-drag': `${displacement}px` }">
    <p class="adventure-band-label">いまの もじ <span aria-hidden="true">▾</span></p>
    <div class="adventure-band-frame">
      <div v-if="word.length > 1" class="adventure-band-link" aria-hidden="true"><i v-for="i in word.length" :key="i" /></div>
      <div class="adventure-band-rows">
        <div v-for="(char, row) in word" :key="row" class="adventure-band" role="group" :tabindex="disabled ? -1 : 0"
          :aria-label="`${row + 1}ばんの おび：${char}`" :aria-disabled="disabled" aria-describedby="adventure-band-help"
          @pointerdown="down" @pointermove="move" @pointerup="release($event)" @pointercancel="release($event, true)" @lostpointercapture="release($event, true)" @keydown="key">
          <div class="adventure-band-strip" aria-hidden="true"><span v-for="offset in offsets" :key="offset" :class="{ 'is-current': offset === 0 }">{{ shiftWord(char, offset) }}</span></div>
        </div>
        <div class="adventure-band-selection" aria-hidden="true" />
      </div>
    </div>
    <span id="adventure-band-help" class="adventure-sr-only">おびを みぎに ひくと 1つ もどす。ひだりに ひくと 1つ すすめる。キーボードも みぎキーで もどす、ひだりキーで すすめる。</span>
  </div>
</template>
