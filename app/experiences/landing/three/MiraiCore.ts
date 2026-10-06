import { IcosahedronGeometry, Mesh } from "three";
import { QUALITY } from "../config";
import { smoothstep } from "../math";
import type { LandingRuntimeState, QualityTier } from "../types";
import { coreMaterial } from "./materials/coreMaterial";
export class MiraiCore {
  readonly material = coreMaterial();
  readonly mesh: Mesh<IcosahedronGeometry, ReturnType<typeof coreMaterial>>;
  private tier: QualityTier;
  constructor(tier: QualityTier) {
    this.tier = tier;
    this.mesh = new Mesh(
      new IcosahedronGeometry(1, QUALITY[tier].detail),
      this.material,
    );
    this.mesh.rotation.set(0.1, -0.25, -0.2);
  }
  quality(tier: QualityTier) {
    if (tier !== this.tier) {
      const old = this.mesh.geometry;
      this.mesh.geometry = new IcosahedronGeometry(1, QUALITY[tier].detail);
      old.dispose();
      this.tier = tier;
    }
    this.material.uniforms.uOctaves!.value = QUALITY[tier].octaves;
  }
  update(s: LandingRuntimeState, morph: number, dissolve: number) {
    const u = this.material.uniforms;
    u.uTime!.value = s.reducedMotion ? 0 : s.elapsed;
    u.uMorph!.value = morph;
    u.uDissolve!.value = dissolve;
    u.uNoiseStrength!.value = 0.31 + smoothstep(0.35, 0.9, s.scrollVh) * 0.38;
    u.uRimStrength!.value = 0.26 + smoothstep(0.2, 1.0, s.scrollVh) * 0.12;
    u.uReveal!.value = s.reducedMotion ? 1 : smoothstep(0.3, 0.85, s.elapsed);
    u.uPointer!.value.set(s.pointerX, s.pointerY);
    u.uVelocity!.value = s.scrollVelocity;
    this.mesh.rotation.y =
      -0.25 + (s.reducedMotion ? 0 : s.elapsed * 0.012 + s.pointerX * 0.038);
    this.mesh.rotation.x = 0.1 + s.pointerY * 0.025;
    this.mesh.visible = dissolve < 0.98 && s.bone < 0.98;
  }
  dispose() {
    this.mesh.geometry.dispose();
    this.material.dispose();
  }
}
