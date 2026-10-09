import {
  ACESFilmicToneMapping,
  Color,
  Group,
  Scene,
  SRGBColorSpace,
  WebGLRenderer,
} from "three";
import { CAMERA, PALETTE } from "../config";
import { earthObservation } from "../earth";
import { mix, smoothstep } from "../math";
import type { LandingRuntimeState, LandingVisual } from "../types";
import { MiraiCore } from "./MiraiCore";
import { MiraiParticles } from "./MiraiParticles";
import { MuseumCamera } from "./MuseumCamera";

export class MuseumWorld implements LandingVisual {
  private renderer: WebGLRenderer;
  private scene = new Scene();
  private camera = new MuseumCamera();
  private core: MiraiCore;
  private particles: MiraiParticles;
  private specimen = new Group();
  private black = new Color(PALETTE.obsidian).convertLinearToSRGB();
  private bone = new Color(PALETTE.bone).convertLinearToSRGB();
  private background = new Color(PALETTE.obsidian);
  private disposed = false;
  private shaderFailed = false;
  private observation = earthObservation(0);
  constructor(
    private canvas: HTMLCanvasElement,
    state: LandingRuntimeState,
    private dpr: () => number,
    private fail: () => void,
  ) {
    const context = canvas.getContext("webgl2", {
      alpha: false,
      antialias: true,
      powerPreference: "high-performance",
    });
    if (!context) throw new Error("WebGL enhancement unavailable");
    this.renderer = new WebGLRenderer({
      canvas,
      context,
      antialias: true,
      alpha: false,
    });
    this.renderer.outputColorSpace = SRGBColorSpace;
    this.renderer.toneMapping = ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;
    this.renderer.debug.onShaderError = (gl, program, vertex, fragment) => {
      this.shaderFailed = true;
      if (import.meta.dev)
        console.error(
          "MIRAI Earth shader",
          gl.getProgramInfoLog(program),
          gl.getShaderInfoLog(vertex),
          gl.getShaderInfoLog(fragment),
        );
    };
    this.scene.background = this.background;
    this.core = new MiraiCore(
      state.quality,
      () => {
        if (!this.disposed) this.fail();
      },
      () => {
        if (!this.disposed)
          canvas.closest<HTMLElement>(".landing")!.dataset.earthReady = "true";
      },
    );
    canvas.closest<HTMLElement>(".landing")!.dataset.earthObject =
      this.core.mesh.uuid;
    this.particles = new MiraiParticles(this.core.textures);
    this.specimen.add(this.core.mesh, this.particles.points);
    this.scene.add(this.specimen);
    canvas.addEventListener("webglcontextlost", this.contextLost);
    this.resize(state);
    // Compile while the DOM opening is already present. Shader errors use the same fallback boundary.
    try {
      this.renderer.compile(this.scene, this.camera.camera);
      if (this.shaderFailed) throw new Error("Museum material unavailable");
    } catch (error) {
      this.dispose();
      throw error;
    }
  }
  private contextLost = (event: Event) => {
    event.preventDefault();
    // No repeated flashing/context reconstruction: retain the authored DOM/static experience.
    this.fail();
  };
  resize(s: LandingRuntimeState) {
    if (this.disposed) return;
    this.renderer.setPixelRatio(this.dpr());
    this.renderer.setSize(s.viewportWidth, s.viewportHeight, false);
    this.camera.resize(s);
    this.core.quality(s.quality);
    this.particles.quality(s.quality, this.dpr());
  }
  update(s: LandingRuntimeState) {
    if (this.disposed) return;
    const dissolve = earthObservation(
      s.scrollVh,
      s.reducedMotion,
      this.observation,
    ).dissolve;
    const settle = smoothstep(3.52, 3.96, s.scrollVh);
    const portrait =
      s.viewportWidth < 760 && s.viewportHeight > s.viewportWidth;
    const preset = portrait ? CAMERA.mobile : CAMERA.desktop;
    const center = smoothstep(0.65, 1.5, s.scrollVh);
    this.specimen.position.set(
      mix(preset.thresholdX, preset.scaleX, center) * (1 - settle),
      mix(preset.thresholdY, preset.scaleY, center) * (1 - settle),
      0,
    );
    this.core.update(s, dissolve);
    // The final latent figure is stable in the gallery coordinate system.
    const rotation = this.core.mesh.rotation;
    this.particles.points.rotation.set(
      rotation.x * (1 - settle),
      rotation.y * (1 - settle),
      rotation.z * (1 - settle),
    );
    this.particles.update(s, dissolve, settle);
    this.camera.update(s);
    // Match CSS color-mix in display space, then convert to Three's working space.
    this.background.setRGB(
      mix(this.black.r, this.bone.r, s.bone),
      mix(this.black.g, this.bone.g, s.bone),
      mix(this.black.b, this.bone.b, s.bone),
      SRGBColorSpace,
    );
    this.renderer.render(this.scene, this.camera.camera);
    if (this.shaderFailed) this.fail();
  }
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.canvas.removeEventListener("webglcontextlost", this.contextLost);
    this.core.dispose();
    this.particles.dispose();
    this.scene.clear();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
  }
}
