<script setup lang="ts">
import ReadableText from "~/components/games/caesar/ReadableText.vue";
const ready = ref(false);
onMounted(() => {
  ready.value = true;
});
const dialog = ref<HTMLDialogElement>();
const trigger = ref<HTMLButtonElement>();
function close() {
  dialog.value?.close();
  trigger.value?.focus();
}
</script>
<template>
  <button
    :disabled="!ready"
    ref="trigger"
    class="museum-menu-button"
    aria-label="メニュー"
    @click="dialog?.showModal()"
  >
    <span aria-hidden="true">☰</span>
  </button>
  <dialog ref="dialog" class="museum-dialog" @close="trigger?.focus()">
    <div class="museum-dialog-head">
      <h2>メニュー</h2>
      <button class="museum-button museum-button--small" @click="close">
        とじる
      </button>
    </div>
    <nav class="museum-menu-links">
      <NuxtLink to="/" @click="close"
        ><ReadableText text="みらい博物館" /></NuxtLink
      ><NuxtLink to="/games/caesar" @click="close">ひだまりで あそぶ</NuxtLink
      ><NuxtLink to="/dinosaur" @click="close">もりランで あそぶ</NuxtLink
      ><NuxtLink to="/games/space-delivery/" @click="close"
        >ねこの宇宙宅配便</NuxtLink
      ><NuxtLink to="/naps" @click="close">おひるねずかん</NuxtLink
      ><NuxtLink to="/about" @click="close">おとなの かたへ・しりょう</NuxtLink>
    </nav>
  </dialog>
</template>
