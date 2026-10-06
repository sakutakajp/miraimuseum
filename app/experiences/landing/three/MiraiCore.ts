import {
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  IcosahedronGeometry,
  Line,
  LineBasicMaterial,
  Mesh,
  NoColorSpace,
  RepeatWrapping,
  SRGBColorSpace,
  TextureLoader,
} from "three";
import { QUALITY } from "../config";
import { earthObservation } from "../earth";
import { smoothstep } from "../math";
import type { LandingRuntimeState, QualityTier } from "../types";
import {
  atmosphereMaterial,
  coreMaterial,
  type EarthTextures,
} from "./materials/coreMaterial";

/** One Earth, retained for every observation. All secondary layers share its transform. */
export class MiraiCore {
  readonly textures: EarthTextures;
  readonly material: ReturnType<typeof coreMaterial>;
  readonly mesh: Mesh<IcosahedronGeometry, ReturnType<typeof coreMaterial>>;
  private atmosphere: Mesh<
    IcosahedronGeometry,
    ReturnType<typeof atmosphereMaterial>
  >;
  private orbit: Line<BufferGeometry, LineBasicMaterial>;
  private tier: QualityTier;
  private disposed = false;
  private observation = earthObservation(0);

  constructor(tier: QualityTier, fail: () => void, ready: () => void) {
    this.tier = tier;
    let loaded = 0;
    const loader = new TextureLoader();
    const texture = (name: string, color: boolean) => {
      const map = loader.load(
        `/landing-earth/${name}.webp`,
        (value) => {
          if (this.disposed) {
            value.dispose();
            return;
          }
          if (++loaded === 4) ready();
        },
        undefined,
        () => {
          if (!this.disposed) fail();
        },
      );
      map.colorSpace = color ? SRGBColorSpace : NoColorSpace;
      map.wrapS = RepeatWrapping;
      map.anisotropy = 4;
      return map;
    };
    this.textures = {
      day: texture("day", true),
      relief: texture("relief", false),
      night: texture("night", true),
      clouds: texture("clouds", false),
    };
    this.material = coreMaterial(this.textures);
    const geometry = new IcosahedronGeometry(
      1,
      Math.min(24, QUALITY[tier].detail),
    );
    this.mesh = new Mesh(geometry, this.material);
    this.mesh.name = "MIRAI EARTH — persistent observation surface";
    this.mesh.rotation.set(0.12, -1.65, -0.16);
    this.atmosphere = new Mesh(
      new IcosahedronGeometry(1, 10),
      atmosphereMaterial(),
    );
    this.atmosphere.scale.setScalar(1.009);
    this.atmosphere.renderOrder = 1;
    this.mesh.add(this.atmosphere);

    // A single incomplete orbital trace: human infrastructure, not a global network diagram.
    const positions = new Float32Array(96 * 3);
    for (let i = 0; i < 96; i++) {
      const a = (i / 95) * Math.PI * 1.52 - 0.65;
      positions[i * 3] = Math.cos(a) * 1.19;
      positions[i * 3 + 1] = Math.sin(a) * 0.67;
      positions[i * 3 + 2] = Math.sin(a) * 0.96;
    }
    const path = new BufferGeometry();
    path.setAttribute("position", new Float32BufferAttribute(positions, 3));
    this.orbit = new Line(
      path,
      new LineBasicMaterial({
        color: new Color("#b4ad98"),
        transparent: true,
        opacity: 0,
        depthWrite: false,
      }),
    );
    this.orbit.rotation.z = 0.34;
    this.mesh.add(this.orbit);
    this.quality(tier);
  }
  quality(tier: QualityTier) {
    if (tier !== this.tier) {
      const old = this.mesh.geometry;
      this.mesh.geometry = new IcosahedronGeometry(
        1,
        Math.min(24, QUALITY[tier].detail),
      );
      old.dispose();
      this.tier = tier;
    }
    this.material.uniforms.uOctaves!.value = QUALITY[tier].octaves;
    for (const map of Object.values(this.textures))
      map.anisotropy = tier === "high" ? 4 : tier === "medium" ? 2 : 1;
  }
  update(s: LandingRuntimeState, dissolve: number) {
    const earth = earthObservation(
      s.scrollVh,
      s.reducedMotion,
      this.observation,
    );
    const u = this.material.uniforms;
    const reveal = s.reducedMotion ? 1 : smoothstep(0.3, 0.85, s.elapsed);
    u.uTime!.value = s.reducedMotion ? 0 : s.elapsed;
    u.uDissolve!.value = dissolve;
    u.uVisibility!.value = earth.light;
    u.uLayers!.value.set(
      earth.life,
      earth.matter,
      earth.machine,
      earth.connected,
    );
    u.uReveal!.value = reveal;
    const a = this.atmosphere.material.uniforms;
    a.uReveal!.value = reveal;
    a.uVisibility!.value = earth.light;
    a.uDissolve!.value = dissolve;
    this.mesh.rotation.y =
      -1.65 + (s.reducedMotion ? 0 : s.elapsed * 0.009 + s.pointerX * 0.035);
    this.mesh.rotation.x = 0.12 + (s.reducedMotion ? 0 : s.pointerY * 0.025);
    this.orbit.material.opacity = earth.machine * (1 - dissolve) * 0.085;
    this.orbit.visible =
      this.tier !== "low" && earth.machine > 0.01 && dissolve < 0.5;
    this.atmosphere.visible = this.tier !== "low";
    this.mesh.visible = dissolve < 0.99 && s.bone < 0.98;
  }
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.mesh.geometry.dispose();
    this.material.dispose();
    this.atmosphere.material.dispose();
    this.atmosphere.geometry.dispose();
    this.orbit.geometry.dispose();
    this.orbit.material.dispose();
    for (const map of Object.values(this.textures)) map.dispose();
    this.mesh.clear();
  }
}
