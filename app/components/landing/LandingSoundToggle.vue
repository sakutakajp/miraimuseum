<script setup lang="ts">
import { AudioDirector } from "~/experiences/landing/AudioDirector";
const enabled = ref(false);
let audio: AudioDirector | undefined;
async function toggle() {
  try {
    audio ??= new AudioDirector();
    enabled.value = await audio.toggle();
  } catch {
    enabled.value = false;
    audio?.dispose();
    audio = undefined;
  }
}
const visibility = () => audio?.visibility(document.hidden);
onMounted(() => document.addEventListener("visibilitychange", visibility));
onBeforeUnmount(() => {
  document.removeEventListener("visibilitychange", visibility);
  audio?.dispose();
});
</script>
<template>
  <button
    class="landing-sound"
    data-testid="landing-sound-toggle"
    :aria-pressed="enabled"
    :aria-label="enabled ? '音をオフにする' : '音をオンにする'"
    @click="toggle"
  >
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path d="M3 8v4h3l4 3V5L6 8H3Z" />
      <path v-if="enabled" d="M13 6c3 2 3 6 0 8M15 3c5 4 5 10 0 14" />
      <path v-else d="m13 8 4 4m0-4-4 4" /></svg
    ><span>SOUND {{ enabled ? "ON" : "OFF" }}</span>
  </button>
</template>
