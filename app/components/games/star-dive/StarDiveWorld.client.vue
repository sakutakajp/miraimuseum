<script setup lang="ts">
import { useLoop, useTresContext } from "@tresjs/core";
import { PerspectiveCamera, WebGLRenderer } from "three";
import { StarDiveScene } from "~/games/star-dive/visual/StarDiveScene";
import { createPost } from "~/games/star-dive/visual/post";
import type { StarDiveRuntime } from "~/games/star-dive/StarDiveRuntime";
import {
  PerformanceManager,
  tiers,
  type Quality,
} from "~/games/star-dive/performance/PerformanceManager";
const props = withDefaults(
  defineProps<{
    runtime: StarDiveRuntime;
    reduced?: boolean;
    preview?: boolean;
    quality?: Quality;
    collisions?: boolean;
    beforeStep?: (dt: number) => void;
  }>(),
  { reduced: false, preview: false, quality: "medium", collisions: false },
);
const emit = defineEmits<{
  ready: [];
  frame: [quality: Quality, fps: number];
  error: [];
}>();
const context = useTresContext(),
  loop = useLoop();
const performanceManager = new PerformanceManager(props.quality);
let view: StarDiveScene | undefined;
let post: ReturnType<typeof createPost> | undefined;
let sizeKey = "",
  failed = false;
watch(
  () => props.quality,
  (value) => {
    performanceManager.force(value);
    sizeKey = "";
  },
);
loop.render((notify) => {
  if (post && !failed) {
    post.composer.render();
    notify();
  }
});
loop.onBeforeRender(({ delta }) => {
  if (failed) return;
  try {
    if (!view) {
      if (
        !context.renderer.isInitialized.value ||
        !(context.camera.activeCamera.value instanceof PerspectiveCamera)
      )
        return;
      const renderer = context.renderer.instance as WebGLRenderer;
      view = new StarDiveScene(
        context.scene.value,
        renderer,
        context.camera.activeCamera.value,
      );
      post = createPost(
        renderer,
        context.scene.value,
        context.camera.activeCamera.value,
      );
      emit("ready");
    }
    if (!props.preview && !props.runtime.clock.paused) {
      props.beforeStep?.(delta);
      props.runtime.update(delta, props.reduced);
      if (performanceManager.update(delta)) sizeKey = "";
    }
    const tier = performanceManager.quality,
      renderer = context.renderer.instance as WebGLRenderer;
    const width = context.sizes.width.value,
      height = context.sizes.height.value;
    const ratio = Math.min(window.devicePixelRatio, tiers[tier].ratio);
    const key = `${width}:${height}:${ratio}`;
    if (key !== sizeKey && post) {
      sizeKey = key;
      renderer.setPixelRatio(ratio);
      renderer.setSize(width, height, false);
      // Low quality keeps the same gameplay and reduces the expensive render targets.
      post.composer.setPixelRatio(tier === "low" ? ratio * 0.75 : ratio);
      post.composer.setSize(width, height);
    }
    view.showCollisions(props.collisions);
    view.update(props.runtime, props.reduced, tier);
    if (post) {
      post.bloom.enabled = tier !== "low";
      post.bloom.strength = view.visual.bloom * tiers[tier].bloom;
      post.finish.uniforms.time!.value = props.runtime.clock.time;
      post.finish.uniforms.aberration!.value = view.visual.aberration;
      renderer.toneMappingExposure = view.visual.exposure;
    }
    emit("frame", tier, Math.round(1 / performanceManager.average));
  } catch (error) {
    failed = true;
    console.error("STAR DIVE renderer failed", error);
    emit("error");
  }
});
onBeforeUnmount(() => {
  view?.dispose();
  post?.dispose();
});
</script>
<template>
  <TresPerspectiveCamera
    :position="[0, 3, 12]"
    :look-at="[0, 0, -10]"
    :fov="60"
    :near="0.1"
    :far="220"
  />
</template>
