<script setup lang="ts">
import manifest from "~/museum/pixel-assets.generated.json";
export type PixelAsset = keyof typeof manifest.assets;
const props = withDefaults(
  defineProps<{
    asset: PixelAsset;
    wideAsset?: PixelAsset;
    landscapeAsset?: PixelAsset;
    alt?: string;
    anchorX?: number;
    anchorY?: number;
    priority?: boolean;
  }>(),
  { alt: "", anchorX: 0.5, anchorY: 0.5 },
);
const host = ref<HTMLElement>();
const box = ref({ width: 360, height: 640 });
const id = computed(() =>
  props.landscapeAsset &&
  box.value.width > box.value.height &&
  box.value.height <= 550
    ? props.landscapeAsset
    : props.wideAsset && box.value.width >= 700
      ? props.wideAsset
      : props.asset,
);
const art = computed(() => manifest.assets[id.value]);
const frame = computed(() => {
  const width = art.value.width * art.value.pixelSize,
    height = art.value.height * art.value.pixelSize;
  return {
    width: `${width}px`,
    height: `${height}px`,
    left: `${Math.floor((box.value.width - width) * props.anchorX)}px`,
    top: `${Math.floor((box.value.height - height) * props.anchorY)}px`,
  };
});
let observer: ResizeObserver | undefined;
onMounted(() => {
  if (!host.value) return;
  observer = new ResizeObserver((entries) => {
    const rect = entries[0]!.contentRect;
    box.value = { width: rect.width, height: rect.height };
  });
  observer.observe(host.value);
});
onBeforeUnmount(() => observer?.disconnect());
</script>
<template>
  <div
    ref="host"
    class="museum-pixel-art"
    :data-pixel-size="art.pixelSize"
    :data-pixel-asset="id"
  >
    <div class="museum-pixel-frame" :style="frame">
      <img
        :src="art.src"
        :width="art.width * art.pixelSize"
        :height="art.height * art.pixelSize"
        :alt="alt"
        :fetchpriority="priority ? 'high' : 'auto'"
      /><slot />
    </div>
  </div>
</template>
<style scoped>
.museum-pixel-art {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
}
.museum-pixel-frame {
  position: absolute;
}
.museum-pixel-frame > img {
  display: block;
  width: 100%;
  height: 100%;
  image-rendering: pixelated;
  max-width: none;
}
.museum-pixel-frame:deep(a),
.museum-pixel-frame:deep(button) {
  pointer-events: auto;
}
</style>
