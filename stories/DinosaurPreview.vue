<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from "vue";
const props = withDefaults(defineProps<{ distance?: number }>(), {
  distance: 2200,
});
const host = ref<HTMLDivElement>();
let game: import("phaser").Game | undefined;
let scene: import("../app/game/DinosaurScene").DinosaurScene | undefined;
let disposed = false;
let created = false;
function render() {
  if (!scene || !created) return;
  scene.setPaused(false);
  scene.expedition.x = props.distance;
  scene.update(0, 0);
  scene.setPaused(true);
}
watch(() => props.distance, render);
onMounted(async () => {
  const [{ default: Phaser }, { DinosaurScene }, { museumAudio }] =
    await Promise.all([
      import("phaser"),
      import("../app/game/DinosaurScene"),
      import("../app/game/audio"),
    ]);
  if (disposed) return;
  class PreviewScene extends DinosaurScene {
    override create() {
      super.create();
      created = true;
      render();
      museumAudio.stop();
    }
  }
  scene = new PreviewScene(
    { state: () => {}, discover: () => {}, cue: () => {}, finish: () => {} },
    1,
    true,
  );
  game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: host.value,
    width: 420,
    height: 600,
    pixelArt: true,
    scene,
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    audio: { noAudio: true },
  });
});
onBeforeUnmount(() => {
  disposed = true;
  game?.destroy(true);
});
</script>
<template>
  <div
    ref="host"
    style="width: 420px; max-width: 100%; height: 600px"
    data-testid="dinosaur-preview"
  />
</template>
