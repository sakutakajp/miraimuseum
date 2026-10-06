import { QUALITY, TRACK_VIEWPORTS } from "./config";
import {
  boneTransition,
  clamp,
  classification,
  damp,
  dampScroll,
  mapProgress,
  preserveProgressOnResize,
  smoothstep,
} from "./math";
import { QualityManager } from "./QualityManager";
import { earthObservation, earthPhase, figureWeights, FIGURES } from "./earth";
import type { LandingRuntimeState, LandingVisual } from "./types";

/** The sole animation clock. Scroll handlers store inputs; they never render. */
export class ExperienceDirector {
  readonly state: LandingRuntimeState;
  readonly quality: QualityManager;
  private visual?: LandingVisual;
  private raf = 0;
  private previous = 0;
  private previousScroll = 0;
  private targetScroll = 0;
  private rawPointerX = 0;
  private rawPointerY = 0;
  private resizePending = true;
  private suspended = false;
  private disposed = false;
  private media = window.matchMedia("(prefers-reduced-motion: reduce)");
  private semantic = "";
  private earth = earthObservation(0);
  private figures = figureWeights(0);
  constructor(
    private root: HTMLElement,
    private onSemantic: (state: LandingRuntimeState) => void,
  ) {
    this.quality = new QualityManager({
      mobile:
        window.innerWidth < 760 ||
        window.matchMedia("(pointer: coarse)").matches,
      cores: navigator.hardwareConcurrency,
      reducedMotion: this.media.matches,
    });
    this.state = {
      ...mapProgress(0),
      scrollVelocity: 0,
      pointerX: 0,
      pointerY: 0,
      pointerActive: false,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight || 844,
      dpr: window.devicePixelRatio || 1,
      reducedMotion: this.media.matches,
      quality: this.quality.tier,
      elapsed: 0,
      scrollVh: 0,
      bone: 0,
      coreState: "",
    };
    this.targetScroll = this.readScroll();
    this.previousScroll = this.targetScroll;
    // Restored browser scroll positions begin at the restored scene, not a long fly-through.
    this.state.scrollVh = this.targetScroll;
    window.addEventListener("scroll", this.scroll, { passive: true });
    window.addEventListener("resize", this.resize, { passive: true });
    window.visualViewport?.addEventListener("resize", this.resize, {
      passive: true,
    });
    root.addEventListener("pointermove", this.pointer, { passive: true });
    root.addEventListener("pointerdown", this.pointer, { passive: true });
    root.addEventListener("pointerup", this.release, { passive: true });
    root.addEventListener("pointercancel", this.release, { passive: true });
    root.addEventListener("pointerleave", this.release, { passive: true });
    document.addEventListener("visibilitychange", this.visibility);
    this.media.addEventListener("change", this.motion);
    this.suspended = document.hidden;
    this.root.dataset.suspended = String(this.suspended);
    if (!this.suspended) this.raf = requestAnimationFrame(this.frame);
  }
  attach(visual: LandingVisual) {
    if (this.disposed || this.state.quality === "static") {
      visual.dispose();
      return;
    }
    this.visual = visual;
    visual.resize(this.state);
  }
  fail = () => {
    this.quality.fallback();
    this.state.quality = "static";
    this.visual?.dispose();
    this.visual = undefined;
    this.root.dataset.renderer = "static";
    this.root.dataset.quality = "static";
  };
  private readScroll() {
    return (
      Math.max(
        0,
        window.scrollY -
          (this.root.getBoundingClientRect().top + window.scrollY),
      ) / this.state.viewportHeight
    );
  }
  private scroll = () => {
    this.targetScroll = this.readScroll();
  };
  private resize = () => {
    this.resizePending = true;
  };
  private pointer = (event: PointerEvent) => {
    if (event.pointerType === "touch" && event.buttons === 0) return;
    this.state.pointerActive = true;
    this.rawPointerX = clamp(
      (event.clientX / this.state.viewportWidth) * 2 - 1,
      -1,
      1,
    );
    this.rawPointerY = clamp(
      (event.clientY / this.state.viewportHeight) * 2 - 1,
      -1,
      1,
    );
  };
  private release = () => {
    this.state.pointerActive = false;
    this.rawPointerX = 0;
    this.rawPointerY = 0;
  };
  private motion = () => {
    this.state.reducedMotion = this.media.matches;
    this.root.dataset.reducedMotion = String(this.media.matches);
  };
  private visibility = () => {
    this.suspended = document.hidden;
    cancelAnimationFrame(this.raf);
    this.previous = 0;
    this.quality.resetWindow();
    this.root.dataset.suspended = String(this.suspended);
    if (!this.suspended && !this.disposed) {
      this.targetScroll = this.readScroll();
      this.raf = requestAnimationFrame(this.frame);
    }
  };
  private frame = (now: number) => {
    if (this.disposed || this.suspended) return;
    const measuredDelta = this.previous ? (now - this.previous) / 1000 : 1 / 60;
    const delta = clamp(measuredDelta, 0, 0.064);
    this.previous = now;
    const s = this.state;
    if (this.resizePending || s.dpr !== window.devicePixelRatio) {
      this.resizePending = false;
      const width = Math.max(1, window.innerWidth),
        height = Math.max(1, window.innerHeight);
      const oldHeight = s.viewportHeight;
      // Browser chrome changes preserve the current normalized location. Orientation changes use the same rule.
      const resizedScroll = preserveProgressOnResize(
        window.scrollY,
        oldHeight,
        height,
      );
      s.viewportWidth = width;
      s.viewportHeight = height;
      s.dpr = window.devicePixelRatio || 1;
      this.root.style.height = `${height * TRACK_VIEWPORTS}px`;
      this.root.style.setProperty("--stage-height", `${height}px`);
      if (oldHeight !== height)
        window.scrollTo({ top: resizedScroll, behavior: "instant" });
      this.targetScroll = this.readScroll();
      this.previousScroll = this.targetScroll;
      this.visual?.resize(s);
    }
    // Reveal timing uses elapsed wall time; damping alone clamps a stalled frame.
    // Hidden tabs reset `previous`, so the shared clock still pauses in the background.
    s.elapsed += Math.max(0, measuredDelta);
    const velocity = clamp(
      (this.targetScroll - this.previousScroll) / Math.max(delta, 0.001),
      -8,
      8,
    );
    s.scrollVelocity = damp(s.scrollVelocity, velocity, 8, delta);
    this.previousScroll = this.targetScroll;
    s.scrollVh = dampScroll(
      s.scrollVh,
      clamp(this.targetScroll, 0, 5.2),
      s.reducedMotion ? 20 : 12,
      delta,
    );
    Object.assign(s, mapProgress(s.scrollVh));
    s.bone = boneTransition(s.scrollVh);
    s.coreState = classification(s.scrollVh);
    s.pointerX = damp(
      s.pointerX,
      s.reducedMotion ? 0 : this.rawPointerX,
      8,
      delta,
    );
    s.pointerY = damp(
      s.pointerY,
      s.reducedMotion ? 0 : this.rawPointerY,
      8,
      delta,
    );
    if (this.visual && this.quality.sample(measuredDelta)) {
      s.quality = this.quality.tier;
      if (s.quality === "static") this.fail();
      else this.visual.resize(s);
    }
    const p = s.scene === "connected" ? s.sceneProgress : 0;
    const css = this.root.style;
    css.setProperty("--landing-progress", String(s.globalProgress));
    css.setProperty("--scene-progress", String(s.sceneProgress));
    css.setProperty("--scroll-velocity", String(s.scrollVelocity));
    css.setProperty("--pointer-x", String(s.pointerX));
    css.setProperty("--pointer-y", String(s.pointerY));
    css.setProperty("--bone", String(s.bone));
    const earth = earthObservation(s.scrollVh, s.reducedMotion, this.earth);
    css.setProperty("--earth-light", String(earth.light));
    css.setProperty("--earth-life", String(earth.life));
    css.setProperty("--earth-matter", String(earth.matter));
    css.setProperty("--earth-machine", String(earth.machine));
    css.setProperty("--earth-dissolve", String(earth.dissolve));
    const figures = figureWeights(s.scrollVh, this.figures);
    for (const figure of FIGURES)
      css.setProperty(`--figure-${figure}`, String(figures[figure]));
    this.root.dataset.earthPhase = earthPhase(s.scrollVh);
    this.root.dataset.earthDissolve = String(earth.dissolve);
    this.root.dataset.connectedForm = FIGURES.reduce((a, b) =>
      figures[a] >= figures[b] ? a : b,
    );
    // Readable controls even when native scrolling stops halfway through the
    // inversion. The color mode is derived from the same gallery transition.
    css.setProperty("--ink-tone", s.bone < 0.475 ? "0" : "1");
    css.setProperty(
      "--core-growth",
      String(s.reducedMotion ? 0 : smoothstep(0.35, 1.25, s.scrollVh)),
    );
    css.setProperty(
      "--core-reveal",
      String(s.reducedMotion ? 1 : smoothstep(0.3, 0.85, s.elapsed)),
    );
    css.setProperty("--grain-opacity", String(QUALITY[s.quality].grain));
    css.setProperty(
      "--threshold-exit",
      String(smoothstep(0.68, 0.97, s.scrollVh)),
    );
    css.setProperty(
      "--brand-reveal",
      String(s.reducedMotion ? 1 : smoothstep(0.65, 1.15, s.elapsed)),
    );
    css.setProperty(
      "--sub-reveal",
      String(s.reducedMotion ? 1 : smoothstep(0.9, 1.4, s.elapsed)),
    );
    css.setProperty(
      "--scroll-cue",
      String(
        (s.reducedMotion ? 1 : smoothstep(1.25, 1.8, s.elapsed)) *
          (1 - smoothstep(0.35, 0.7, s.scrollVh)),
      ),
    );
    css.setProperty("--line-one", String(smoothstep(0.1, 0.34, p)));
    css.setProperty("--line-two", String(smoothstep(0.25, 0.52, p)));
    css.setProperty("--support-reveal", String(smoothstep(0.38, 0.65, p)));
    css.setProperty("--connected-hold", String(smoothstep(0.72, 0.85, p)));
    css.setProperty(
      "--sound-reveal",
      String(s.reducedMotion ? 1 : smoothstep(1.4, 1.9, s.elapsed)),
    );
    css.setProperty(
      "--scale-opacity",
      String(
        smoothstep(0.9, 1.1, s.scrollVh) *
          (1 - smoothstep(3.1, 3.45, s.scrollVh)),
      ),
    );
    this.root.dataset.scene = s.scene;
    this.root.dataset.coreState = s.coreState.toLowerCase() || "points";
    this.root.dataset.quality = s.quality;
    this.root.dataset.reducedMotion = String(s.reducedMotion);
    const semantic = `${s.scene}:${s.coreState}:${s.quality}`;
    if (semantic !== this.semantic) {
      this.semantic = semantic;
      this.onSemantic(s);
    }
    try {
      this.visual?.update(s, delta);
    } catch {
      this.fail();
    }
    this.raf = requestAnimationFrame(this.frame);
  };
  pixelRatio() {
    return this.quality.pixelRatio(this.state.dpr);
  }
  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    window.removeEventListener("scroll", this.scroll);
    window.removeEventListener("resize", this.resize);
    window.visualViewport?.removeEventListener("resize", this.resize);
    this.root.removeEventListener("pointermove", this.pointer);
    this.root.removeEventListener("pointerdown", this.pointer);
    this.root.removeEventListener("pointerup", this.release);
    this.root.removeEventListener("pointercancel", this.release);
    this.root.removeEventListener("pointerleave", this.release);
    document.removeEventListener("visibilitychange", this.visibility);
    this.media.removeEventListener("change", this.motion);
    this.visual?.dispose();
    this.visual = undefined;
  }
}
