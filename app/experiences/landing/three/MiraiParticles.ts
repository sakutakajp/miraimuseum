import {
  BufferAttribute,
  BufferGeometry,
  LineSegments,
  Points,
  ShaderMaterial,
  Vector3,
  Vector4,
} from "three";
import { QUALITY } from "../config";
import { figureWeights } from "../earth";
import type { LandingRuntimeState, QualityTier } from "../types";
import { NOISE, type EarthTextures } from "./materials/coreMaterial";

const TAU = Math.PI * 2;
const CRYSTAL = [
  [-0.65, -1.12, 0.12],
  [0.64, -0.97, 0.08],
  [0.95, 0.19, 0],
  [0.47, 1.32, 0.06],
  [-0.38, 1.49, 0.12],
  [-0.89, 0.27, 0.02],
  [-0.28, -0.71, 0.55],
  [0.4, -0.6, 0.51],
  [0.51, 0.24, 0.47],
  [0.23, 0.95, 0.53],
  [-0.23, 1.04, 0.58],
  [-0.52, 0.26, 0.49],
];
const CRYSTAL_EDGES = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 4],
  [4, 5],
  [5, 0],
  [6, 7],
  [7, 8],
  [8, 9],
  [9, 10],
  [10, 11],
  [11, 6],
  [0, 6],
  [1, 7],
  [2, 8],
  [3, 9],
  [4, 10],
  [5, 11],
  [6, 8],
  [8, 10],
  [10, 6],
];
const NODES = [
  [-1.5, 0.4, 0.08],
  [-0.92, 1.09, 0.2],
  [-0.03, 1.2, 0.1],
  [0.83, 0.82, 0.14],
  [1.53, 1.23, 0],
  [-0.55, 0.04, 0.3],
  [0.32, 0.3, 0.24],
  [1.2, -0.2, 0.1],
  [1.73, -0.62, 0.04],
  [-1.02, -0.87, 0.12],
  [0.12, -0.92, 0.32],
  [0.94, -1.34, 0.06],
];
const LINKS = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 4],
  [1, 5],
  [5, 6],
  [6, 3],
  [3, 7],
  [7, 8],
  [0, 5],
  [5, 9],
  [9, 10],
  [10, 7],
  [7, 4],
  [2, 6],
  [6, 10],
  [10, 11],
  [5, 10],
];
const AFRICA = [
  [-0.5, 0.36, 0],
  [-0.62, 0.14, 0],
  [-0.51, -0.06, 0],
  [-0.27, -0.13, 0],
  [-0.23, -0.3, 0],
  [-0.07, -0.51, 0],
  [0.01, -0.82, 0],
  [0.17, -0.97, 0],
  [0.34, -0.87, 0],
  [0.44, -0.67, 0],
  [0.45, -0.4, 0],
  [0.66, -0.09, 0],
  [0.7, 0.14, 0],
  [0.44, 0.07, 0],
  [0.3, 0.34, 0],
  [0.02, 0.36, 0],
  [-0.29, 0.4, 0],
  [-0.5, 0.36, 0],
];
const COAST = AFRICA.slice(1).map((_, i) => [i, i + 1]);

function edgePoint(
  nodes: number[][],
  edges: number[][],
  t: number,
  out: Float32Array,
  offset: number,
) {
  const n = t * edges.length,
    i = Math.min(edges.length - 1, Math.floor(n));
  const edge = edges[i]!,
    a = nodes[edge[0]!]!,
    b = nodes[edge[1]!]!;
  const blend = n - i;
  for (let axis = 0; axis < 3; axis++)
    out[offset + axis] = a[axis]! + (b[axis]! - a[axis]!) * blend;
}
/** Incomplete drawings, not literal icons. All vertices are sampled once at construction. */
function target(
  form: number,
  t: number,
  band: number,
  out: Float32Array,
  offset: number,
) {
  const a = t * TAU;
  let x = 0,
    y = 0,
    z = 0;
  if (form === 0) {
    if (band < 2) {
      const arc = a * 0.8 - 0.4;
      x = Math.cos(arc) * 1.85;
      y = Math.sin(arc) * 0.68 + Math.cos(arc) * 0.31;
      z = Math.sin(arc) * 0.44;
    } else {
      const arc = a * 0.72 + 0.15;
      const r = 1.04 + (band - 2) * 0.045;
      x = Math.cos(arc) * r;
      y = Math.sin(arc) * r;
      z = 0.04;
    }
  } else if (form === 1) {
    const centers = [
      [-0.1, 0.05, 1.18],
      [0.77, 0.77, 0.48],
      [-1.12, -0.55, 0.38],
      [0.25, 0.15, 0.58],
      [0.07, 0.1, 0.31],
    ];
    const c = centers[band]!;
    const ripple = 1 + Math.sin(a * 3 + band) * 0.08 + Math.cos(a * 5) * 0.03;
    x = c[0]! + Math.cos(a) * c[2]! * ripple;
    y = c[1]! + Math.sin(a) * c[2]! * ripple * 0.95;
    z = Math.sin(a * 2) * 0.08;
  } else if (form === 2) {
    edgePoint(CRYSTAL, CRYSTAL_EDGES, t, out, offset);
    return;
  } else if (form === 3) {
    edgePoint(NODES, LINKS, t, out, offset);
    return;
  } else {
    if (band < 2) {
      const arc = a * 0.76 + 0.1;
      const r = 1.22 + band * 0.045;
      x = Math.cos(arc) * r;
      y = Math.sin(arc) * r;
      z = 0.03;
    } else if (band < 4) {
      edgePoint(AFRICA, COAST, t, out, offset);
      return;
    } else {
      const arc = a * 0.76;
      x = Math.cos(arc) * 0.97;
      y = Math.sin(arc) * 0.3 + Math.cos(arc) * 0.16;
      z = Math.sin(arc) * 0.27;
    }
  }
  out[offset] = x;
  out[offset + 1] = y;
  out[offset + 2] = z;
}

const VERTEX = /* glsl */ `
attribute vec3 aOrbit,aLife,aCrystal,aNetwork,aContour;
attribute float aSeed;
uniform float uTime,uDissolve,uSettle,uDpr,uBone,uVelocity,uMotion,uContour;
uniform vec4 uFigures;
uniform vec3 uOffset;
uniform float uScale;
uniform sampler2D uDay;
varying float vAlpha,vSeed;
varying vec3 vColor;
${NOISE}
void main(){
  vec3 source=normalize(position);
  float breakup=earthBreakup(source);
  float release=smoothstep(breakup-.035,breakup+.035,uDissolve);
  vec3 p=source*(1.0+release*(.18+aSeed*.4)*(1.0+uVelocity*.02));
  p+=vec3(sin(uTime*.10+aSeed*40.0),cos(uTime*.12+aSeed*23.0),0.0)*release*.018*uMotion;
  vec4 world=modelMatrix*vec4(p,1.0);
  vec3 latent=aOrbit*uFigures.x+aLife*uFigures.y+aCrystal*uFigures.z+aNetwork*uFigures.w+aContour*uContour;
  world.xyz=mix(world.xyz,latent*uScale+uOffset,uSettle);
  vec4 view=viewMatrix*world;
  gl_Position=projectionMatrix*view;
  gl_PointSize=clamp((1.2+aSeed*.85)*uDpr*(7.0/-view.z),.8,3.0*uDpr);
  vAlpha=release*mix(.72,.44,uSettle);
  vSeed=aSeed;
  vec3 geography=texture2D(uDay,earthUv(source)).rgb;
  vColor=mix(vec3(.40,.48,.51),geography,.25);
}
`;
export class MiraiParticles {
  readonly geometry = new BufferGeometry();
  readonly material: ShaderMaterial;
  readonly points: Points;
  private contours: LineSegments<BufferGeometry, ShaderMaterial>;
  private weights = figureWeights(0);
  constructor(textures: EarthTextures) {
    const uniforms = {
      uTime: { value: 0 },
      uDissolve: { value: 0 },
      uSettle: { value: 0 },
      uDpr: { value: 1 },
      uBone: { value: 0 },
      uVelocity: { value: 0 },
      uMotion: { value: 1 },
      uFigures: { value: new Vector4(1, 0, 0, 0) },
      uContour: { value: 0 },
      uOffset: { value: new Vector3(2.75, 0.25, 0) },
      uScale: { value: 1 },
      uDay: { value: textures.day },
    };
    this.material = new ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms,
      vertexShader: VERTEX,
      fragmentShader: /* glsl */ `
        uniform float uBone;
        varying float vAlpha,vSeed;
        varying vec3 vColor;
        void main(){
          float circle=1.0-smoothstep(.18,.5,length(gl_PointCoord-.5));
          vec3 color=mix(vColor,vec3(.19,.18,.15),uBone);
          gl_FragColor=vec4(color,circle*vAlpha*(.48+vSeed*.52));
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    });
    this.fillGeometry(this.geometry, QUALITY.high.particles, false);
    this.geometry.setIndex(
      new BufferAttribute(new Uint16Array(QUALITY.high.particles), 1),
    );
    this.points = new Points(this.geometry, this.material);
    this.points.frustumCulled = false;
    const contourGeometry = new BufferGeometry();
    this.fillGeometry(contourGeometry, 640, true);
    const contourMaterial = new ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms,
      vertexShader: VERTEX,
      fragmentShader: /* glsl */ `
        uniform float uBone,uSettle;
        varying float vAlpha;
        varying vec3 vColor;
        void main(){
          gl_FragColor=vec4(mix(vColor,vec3(.20,.19,.17),uBone),vAlpha*mix(.15,.28,uSettle));
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    });
    this.contours = new LineSegments(contourGeometry, contourMaterial);
    this.contours.frustumCulled = false;
    this.points.add(this.contours);
  }
  private fillGeometry(
    geometry: BufferGeometry,
    count: number,
    lines: boolean,
  ) {
    const positions = new Float32Array(count * 3),
      seeds = new Float32Array(count);
    const targets = Array.from(
      { length: 5 },
      () => new Float32Array(count * 3),
    );
    for (let i = 0; i < count; i++) {
      const sample = lines ? Math.floor(i / 2) : i;
      const y = 1 - (2 * (sample + 0.5)) / (lines ? count / 2 : count);
      const radius = Math.sqrt(1 - y * y),
        angle = sample * 2.399963229728653 + (lines ? (i % 2) * 0.055 : 0);
      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = Math.sin(angle) * radius;
      seeds[i] = (Math.sin(sample * 127.1 + 311.7) * 43758.5453) % 1;
      if (seeds[i]! < 0) seeds[i] = seeds[i]! + 1;
      const band = sample % 5;
      // Adjacent line vertices remain adjacent in each latent structure.
      const t = lines
        ? Math.min(0.999999, (Math.floor(sample / 5) + (i % 2)) / 64)
        : (Math.floor(i / 5) + 0.5) / (count / 5);
      for (let form = 0; form < 5; form++) {
        if (
          lines &&
          (form === 2 || form === 3 || (form === 4 && band > 1 && band < 4))
        ) {
          const edges = form === 2 ? CRYSTAL_EDGES : form === 3 ? LINKS : COAST;
          const nodes = form === 2 ? CRYSTAL : form === 3 ? NODES : AFRICA;
          const subdivisions = Math.ceil(count / 2 / edges.length);
          const edgeT =
            ((sample % edges.length) +
              Math.min(
                0.999999,
                (Math.floor(sample / edges.length) + (i % 2)) / subdivisions,
              )) /
            edges.length;
          edgePoint(nodes, edges, edgeT, targets[form]!, i * 3);
        } else target(form, t, band, targets[form]!, i * 3);
      }
    }
    geometry.setAttribute("position", new BufferAttribute(positions, 3));
    geometry.setAttribute("aSeed", new BufferAttribute(seeds, 1));
    const names = ["aOrbit", "aLife", "aCrystal", "aNetwork", "aContour"];
    for (let i = 0; i < 5; i++)
      geometry.setAttribute(names[i]!, new BufferAttribute(targets[i]!, 3));
  }
  quality(tier: QualityTier, dpr: number) {
    const count = QUALITY[tier].particles,
      full = QUALITY.high.particles;
    const index = this.geometry.getIndex()!;
    const indices = index.array;
    for (let i = 0; i < count; i++) indices[i] = Math.floor((i * full) / count);
    index.needsUpdate = true;
    this.geometry.setDrawRange(0, count);
    this.material.uniforms.uDpr!.value = dpr;
    this.contours.geometry.setDrawRange(
      0,
      tier === "high" ? 640 : tier === "medium" ? 400 : 200,
    );
  }
  update(s: LandingRuntimeState, dissolve: number, settle: number) {
    const u = this.material.uniforms,
      w = figureWeights(s.scrollVh, this.weights);
    u.uTime!.value = s.reducedMotion ? 0 : s.elapsed;
    u.uMotion!.value = s.reducedMotion ? 0 : 1;
    u.uDissolve!.value = dissolve;
    u.uSettle!.value = settle;
    u.uBone!.value = s.bone;
    u.uVelocity!.value = s.reducedMotion
      ? 0
      : Math.min(Math.abs(s.scrollVelocity), 3);
    u.uFigures!.value.set(w.orbit, w.life, w.crystal, w.network);
    u.uContour!.value = w.contour;
    const portrait =
      s.viewportWidth < 760 && s.viewportHeight > s.viewportWidth;
    u.uOffset!.value.set(portrait ? 0.42 : 2.75, portrait ? 1.55 : 0.25, 0);
    u.uScale!.value = portrait ? 0.7 : 1;
    this.points.visible = dissolve > 0.005;
  }
  dispose() {
    this.geometry.dispose();
    this.material.dispose();
    this.contours.geometry.dispose();
    this.contours.material.dispose();
    this.points.clear();
  }
}
