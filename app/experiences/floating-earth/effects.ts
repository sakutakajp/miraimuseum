import {
  AdditiveBlending, BufferGeometry, Color, DoubleSide, Float32BufferAttribute,
  Group, Mesh, PlaneGeometry, Points, ShaderMaterial,
} from "three";
import { disposeEarthObjects } from "./model";

const vertex = `varying vec2 vUv;
void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;

function veil(width: number, height: number, beam = false) {
  return new Mesh(new PlaneGeometry(width, height), new ShaderMaterial({
    uniforms: { strength: { value: 0 }, tint: { value: new Color("#ffffff") } },
    transparent: true, depthWrite: false, depthTest: true, side: DoubleSide,
    forceSinglePass: true,
    blending: AdditiveBlending, toneMapped: false,
    vertexShader: vertex,
    fragmentShader: `varying vec2 vUv; uniform float strength; uniform vec3 tint;
      void main() {
        vec2 p = vUv - 0.5;
        float light = ${beam
          ? "exp(-p.x * p.x * 64.0) * pow(1.0 - vUv.y, 2.5) * smoothstep(0.0, 0.07, vUv.y)"
          : "exp(-dot(p, p) * 26.0) * (1.0 - smoothstep(0.36, 0.5, length(p)))"};
        gl_FragColor = vec4(tint, light * strength);
        #include <colorspace_fragment>
      }`,
  }));
}

/** All light is local to the surface anchor and respects the Earth's depth. */
export class RevealEffects {
  readonly object3D = new Group();
  private glow = veil(0.15, 0.15);
  private flare = veil(0.075, 0.075);
  private beams = [veil(0.038, 0.17, true), veil(0.038, 0.17, true)];
  private sparkles: Points<BufferGeometry, ShaderMaterial>;

  constructor() {
    this.object3D.name = "DinosaurEffectRoot";
    this.glow.rotation.x = this.flare.rotation.x = -Math.PI / 2;
    this.glow.position.y = 0.002;
    this.flare.position.y = 0.003;
    this.beams[0]!.position.y = this.beams[1]!.position.y = 0.085;
    this.beams[1]!.rotation.y = Math.PI / 2;
    const positions: number[] = [], seeds: number[] = [];
    for (let i = 0; i < 14; i++) {
      const angle = i * 2.399963;
      const radius = 0.012 + (i % 5) * 0.007;
      positions.push(Math.cos(angle) * radius, 0.014 + (i % 7) * 0.014, Math.sin(angle) * radius);
      seeds.push(i * 0.71);
    }
    const geometry = new BufferGeometry();
    geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
    geometry.setAttribute("seed", new Float32BufferAttribute(seeds, 1));
    this.sparkles = new Points(geometry, new ShaderMaterial({
      uniforms: { time: { value: 0 }, strength: { value: 0 }, pixelRatio: { value: 1 } },
      transparent: true, depthWrite: false, depthTest: true,
      blending: AdditiveBlending, toneMapped: false,
      vertexShader: `attribute float seed; uniform float time; uniform float pixelRatio; varying float twinkle;
        void main() {
          twinkle = pow(0.5 + 0.5 * sin(time * 3.0 + seed), 4.0);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = (1.5 + twinkle * 1.3) * pixelRatio;
        }`,
      fragmentShader: `uniform float strength; varying float twinkle;
        void main() {
          float r = length(gl_PointCoord - 0.5);
          float a = (1.0 - smoothstep(0.05, 0.5, r)) * strength * twinkle;
          gl_FragColor = vec4(vec3(1.0), a);
          #include <colorspace_fragment>
        }`,
    }));
    this.object3D.add(this.glow, this.flare, ...this.beams, this.sparkles);
    this.object3D.visible = false;
  }

  update(time: number, strength: number, reducedMotion: boolean, pixelRatio: number) {
    this.object3D.visible = strength > 0;
    this.glow.material.uniforms.strength!.value = strength * 0.45;
    this.flare.material.uniforms.strength!.value = strength * 0.55;
    for (const beam of this.beams) {
      beam.visible = !reducedMotion && strength > 0.12;
      beam.material.uniforms.strength!.value = strength * 0.22;
    }
    this.sparkles.visible = !reducedMotion && strength > 0.12;
    this.sparkles.material.uniforms.time!.value = time;
    this.sparkles.material.uniforms.strength!.value = strength * 0.65;
    this.sparkles.material.uniforms.pixelRatio!.value = pixelRatio;
  }

  dispose() {
    disposeEarthObjects(this.object3D);
    // disposeEarthObjects handles meshes; the point buffer and material belong here.
    this.sparkles.geometry.dispose();
    this.sparkles.material.dispose();
  }
}
