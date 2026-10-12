<script setup lang="ts">
const ready = ref(false);
onMounted(() => {
  ready.value = true;
});
const { enabled, unavailable, toggle } = useMuseumMusic();
</script>
<template>
  <button
    class="museum-music-button"
    :disabled="!ready"
    :aria-label="enabled ? 'おんがくを オフ' : 'おんがくを オン'"
    :aria-pressed="enabled"
    :title="
      unavailable
        ? 'この ブラウザでは おんがくが つかえないよ'
        : enabled
          ? 'おんがくを オフ'
          : 'おんがくを オン'
    "
    @click="toggle"
  >
    <span aria-hidden="true">{{ enabled ? "♫" : "♪" }}</span
    ><span v-if="!enabled" class="museum-music-off" aria-hidden="true">／</span>
  </button>
</template>
<style scoped>
.museum-music-button {
  position: relative;
}
.museum-music-off {
  position: absolute;
  font-size: 1.7rem;
  opacity: 0.65;
}
</style>
