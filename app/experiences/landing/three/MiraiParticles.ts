import {
  BufferAttribute,
  BufferGeometry,
  Color,
  Points,
  ShaderMaterial,
} from "three";
import { QUALITY } from "../config";
import type { LandingRuntimeState, QualityTier } from "../types";
import { NOISE } from "./materials/coreMaterial";
export class MiraiParticles {
  readonly geometry = new BufferGeometry();
  readonly material: ShaderMaterial;
  readonly points: Points;
  constructor() {
    const count = QUALITY.high.particles;
    const positions = new Float32Array(count * 3),
      latent = new Float32Array(count * 3),
      seeds = new Float32Array(count);
    // A deterministic low-discrepancy sample: a specimen, not random confetti.
    for (let i = 0; i < count; i++) {
      const y = 1 - (2 * (i + 0.5)) / count;
      const radius = Math.sqrt(1 - y * y),
        angle = i * 2.399963229728653;
      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = Math.sin(angle) * radius;
      const a = angle % (Math.PI * 2),
        band = i % 5;
      const r = 1.8 + band * 0.2 + Math.sin(i * 7.13) * 0.045;
      latent[i * 3] = Math.cos(a) * r * 1.3 + 2.2;
      latent[i * 3 + 1] = Math.sin(a) * r * 0.54 + Math.cos(a) * 0.65;
      latent[i * 3 + 2] = Math.sin(a) * r * 0.55 + (band - 2) * 0.2;
      seeds[i] = (Math.sin(i * 127.1 + 311.7) * 43758.5453) % 1;
      if (seeds[i]! < 0) seeds[i] = seeds[i]! + 1;
    }
    this.geometry.setAttribute("position", new BufferAttribute(positions, 3));
    this.geometry.setAttribute("aLatent", new BufferAttribute(latent, 3));
    this.geometry.setAttribute("aSeed", new BufferAttribute(seeds, 1));
    this.material = new ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: {
        uTime: { value: 0 },
        uMorph: { value: 0 },
        uDissolve: { value: 0 },
        uSettle: { value: 0 },
        uDpr: { value: 1 },
        uBone: { value: 0 },
        uVelocity: { value: 0 },
        uColor: { value: new Color("#b9c6cd") },
        uOctaves: { value: 4 },
      },
      vertexShader: /* glsl */ `
        attribute vec3 aLatent;
        attribute float aSeed;
        uniform float uTime, uMorph, uDissolve, uSettle, uDpr, uVelocity, uOctaves;
        varying float vAlpha, vSeed;
        ${NOISE}
        void main() {
          vec3 p = corePosition(position, uMorph, uTime, 0.69, uOctaves);
          float breakup = noise3(p * 7.0 + vec3(3.0));
          float release = smoothstep(breakup - 0.08, breakup + 0.08, uDissolve);
          vec3 drift = normalize(position) * release * (0.3 + aSeed * 0.7) * (1.0 + min(uVelocity, 3.0) * 0.025);
          p += drift;
          p += vec3(sin(uTime * 0.1 + aSeed * 40.0), cos(uTime * 0.12 + aSeed * 23.0), 0.0) * release * 0.025;
          p = mix(p, aLatent, uSettle);
          vec4 world = modelMatrix * vec4(p, 1.0);
          vec4 view = viewMatrix * world;
          gl_Position = projectionMatrix * view;
          gl_PointSize = clamp((1.0 + aSeed * 0.7) * uDpr * (7.0 / -view.z), 0.7, 3.0 * uDpr);
          vAlpha = release * mix(0.75, 0.42, uSettle);
          vSeed = aSeed;
        }`,
      fragmentShader: /* glsl */ `
        uniform float uBone;
        uniform vec3 uColor;
        varying float vAlpha, vSeed;
        void main() {
          float circle = 1.0 - smoothstep(0.18, 0.5, length(gl_PointCoord - 0.5));
          vec3 color = mix(uColor, vec3(0.20, 0.19, 0.16), uBone);
          gl_FragColor = vec4(color, circle * vAlpha * (0.4 + vSeed * 0.6));
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    });
    this.points = new Points(this.geometry, this.material);
    this.points.frustumCulled = false;
  }
  quality(tier: QualityTier, dpr: number) {
    // Evenly subsample all the bands, rather than crop the point field on downgrade.
    const count = QUALITY[tier].particles;
    const full = QUALITY.high.particles;
    const indices = new Uint16Array(count);
    for (let i = 0; i < count; i++) indices[i] = Math.floor((i * full) / count);
    this.geometry.setIndex(new BufferAttribute(indices, 1));
    this.material.uniforms.uDpr!.value = dpr;
    this.material.uniforms.uOctaves!.value = QUALITY[tier].octaves;
  }
  update(
    s: LandingRuntimeState,
    morph: number,
    dissolve: number,
    settle: number,
  ) {
    const u = this.material.uniforms;
    u.uTime!.value = s.reducedMotion ? 0 : s.elapsed;
    u.uMorph!.value = morph;
    u.uDissolve!.value = dissolve;
    u.uSettle!.value = settle;
    u.uBone!.value = s.bone;
    u.uVelocity!.value = s.reducedMotion
      ? 0
      : Math.min(Math.abs(s.scrollVelocity), 3);
    this.points.visible = dissolve > 0.015;
  }
  dispose() {
    this.geometry.dispose();
    this.material.dispose();
  }
}
