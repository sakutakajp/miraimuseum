<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from "vue";
import type { Quality } from "../app/game/dinosaur/config/visual";
const props = withDefaults(
  defineProps<{
    seconds?: number;
    reducedMotion?: boolean;
    quality?: Quality;
    animate?: boolean;
  }>(),
  { seconds: 17, quality: "high", reducedMotion: false, animate: false },
);
const host = ref<HTMLDivElement>();
let game: import("phaser").Game | undefined,
  disposed = false,
  seek: ((t: number) => void) | undefined;
watch(
  () => [props.seconds, props.reducedMotion],
  () => seek?.(props.seconds),
);
onMounted(async () => {
  const [
    { default: Phaser },
    { STAGE_01 },
    { LevelRuntime },
    { CameraDirector },
    { VisualDirector },
    { VfxDirector },
    { BackgroundLayers },
    { TerrainRenderer },
    { DinosaurRenderer },
    { PlayerRenderer },
    { BoundaryRenderer },
    { createTextures, loadPlates },
  ] = await Promise.all([
    import("phaser"),
    import("../app/game/dinosaur/levels/stage01"),
    import("../app/game/dinosaur/systems/LevelRuntime"),
    import("../app/game/dinosaur/systems/CameraDirector"),
    import("../app/game/dinosaur/systems/VisualDirector"),
    import("../app/game/dinosaur/systems/VfxDirector"),
    import("../app/game/dinosaur/rendering/BackgroundLayers"),
    import("../app/game/dinosaur/rendering/TerrainRenderer"),
    import("../app/game/dinosaur/rendering/DinosaurRenderer"),
    import("../app/game/dinosaur/rendering/PlayerRenderer"),
    import("../app/game/dinosaur/rendering/BoundaryRenderer"),
    import("../app/game/dinosaur/rendering/textures"),
  ]);
  if (disposed) return;
  class Preview extends Phaser.Scene {
    runtime = new LevelRuntime(STAGE_01);
    cameraDirector = new CameraDirector(props.reducedMotion);
    visual = new VisualDirector(props.reducedMotion);
    bg!: InstanceType<typeof BackgroundLayers>;
    terrain!: InstanceType<typeof TerrainRenderer>;
    dinosaurs!: InstanceType<typeof DinosaurRenderer>;
    player!: InstanceType<typeof PlayerRenderer>;
    boundary!: InstanceType<typeof BoundaryRenderer>;
    vfx!: InstanceType<typeof VfxDirector>;
    constructor() {
      super("deep-time-preview");
    }
    preload() {
      loadPlates(this);
    }
    create() {
      createTextures(this);
      this.bg = new BackgroundLayers(this);
      this.terrain = new TerrainRenderer(this);
      this.dinosaurs = new DinosaurRenderer(this);
      this.player = new PlayerRenderer(this);
      this.boundary = new BoundaryRenderer(this);
      this.vfx = new VfxDirector(this, props.reducedMotion);
      this.runtime.onCue = (cue) => {
        if (cue.type === "dinosaur")
          this.dinosaurs.cue(
            cue.value,
            this.runtime.world.clock.elapsedSeconds,
          );
        if (cue.value === "impact-flash")
          this.visual.flash(this.runtime.world.clock.elapsedSeconds);
      };
      this.runtime.world.onLand = () =>
        this.player.land(this.runtime.world.clock.elapsedSeconds);
      seek = (t) => {
        this.cameraDirector = new CameraDirector(props.reducedMotion);
        this.visual = new VisualDirector(props.reducedMotion);
        this.runtime.reset();
        this.dinosaurs.reset();
        this.visual.reset();
        this.player.reset();
        for (const c of STAGE_01.challenges) this.runtime.world.queueJump(c.at);
        while (
          this.runtime.world.clock.elapsedSeconds < t - 1e-9 &&
          this.runtime.world.state.alive
        )
          this.runtime.advance(
            Math.min(0.25, t - this.runtime.world.clock.elapsedSeconds),
          );
        this.render(0);
      };
      seek(props.seconds);
    }
    override update(_t: number, delta: number) {
      if (props.animate) {
        if (this.runtime.world.clock.elapsedSeconds >= 76.8) seek?.(0);
        this.runtime.advance(delta / 1000);
      }
      if (this.bg) this.render(props.animate ? delta / 1000 : 0);
    }
    private render(delta: number) {
      const world = this.runtime.world,
        t = world.clock.elapsedSeconds,
        section = this.runtime.section.id,
        c = this.cameraDirector.compose(420, 844, t, section);
      this.bg.render(
        c,
        world.state.worldX,
        t,
        section,
        this.visual.environment(section),
        props.reducedMotion,
        props.quality === "low",
      );
      this.dinosaurs.render(c, t, section, props.quality === "low");
      this.terrain.render(c, world, false);
      this.player.render(c, world.state, t, -1);
      this.vfx.render(
        c,
        t,
        delta,
        section,
        props.quality,
        this.visual.flashAlpha(t),
        -1,
      );
      this.boundary.render(c, t);
    }
  }
  game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: host.value,
    width: 420,
    height: 844,
    pixelArt: false,
    scene: new Preview(),
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    audio: { noAudio: true },
  });
});
onBeforeUnmount(() => {
  disposed = true;
  seek = undefined;
  game?.destroy(true);
});
</script>
<template>
  <div
    ref="host"
    style="width: 420px; max-width: 100%; height: 844px; background: #10110f"
    data-testid="dinosaur-preview"
  />
</template>
