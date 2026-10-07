import {
  AdditiveBlending, BufferGeometry, Color, CylinderGeometry, DoubleSide, Float32BufferAttribute,
  Group, Mesh, PlaneGeometry, Points, ShaderMaterial,
} from "three";
import { disposeEarthObjects } from "./model";

const vertex = `varying vec2 vUv;
void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;

function veil(width: number, height: number) {
  return new Mesh(new PlaneGeometry(width, height), new ShaderMaterial({
    uniforms: { strength: { value: 0 }, tint: { value: new Color("#ffffff") } },
    transparent: true, depthWrite: false, depthTest: true, side: DoubleSide,
    forceSinglePass: true,
    blending: AdditiveBlending, toneMapped: false,
    vertexShader: vertex,
    fragmentShader: `varying vec2 vUv; uniform float strength; uniform vec3 tint;
      void main() {
        vec2 p = vUv - 0.5;
        float light = exp(-dot(p, p) * 26.0) * (1.0 - smoothstep(0.36, 0.5, length(p)));
        gl_FragColor = vec4(tint, light * strength);
        #include <colorspace_fragment>
      }`,
  }));
}

function lightColumn() {
  const geometry = new CylinderGeometry(0.025, 0.095, 0.78, 24, 1, true);
  geometry.translate(0, 0.39, 0);
  const column = new Mesh(geometry, new ShaderMaterial({
    uniforms: { strength: { value: 0 } },
    transparent: true, depthWrite: false, depthTest: true, side: DoubleSide,
    forceSinglePass: true, blending: AdditiveBlending, toneMapped: false,
    vertexShader: `varying vec2 vUv; varying vec3 vNormal; varying vec3 vView;
      void main() {
        vUv = uv;
        vec4 view = modelViewMatrix * vec4(position, 1.0);
        vNormal = normalize(normalMatrix * normal);
        vView = -view.xyz;
        gl_Position = projectionMatrix * view;
      }`,
    fragmentShader: `varying vec2 vUv; varying vec3 vNormal; varying vec3 vView; uniform float strength;
      void main() {
        float edge = pow(abs(dot(normalize(vNormal), normalize(vView))), 1.8);
        float height = smoothstep(0.0, 0.05, vUv.y) * (1.0 - smoothstep(0.2, 1.0, vUv.y));
        gl_FragColor = vec4(vec3(1.0), edge * height * strength);
        #include <colorspace_fragment>
      }`,
  }));
  column.name = "DinosaurLightColumn";
  return column;
}

/** All light is local to the surface anchor and respects the Earth's depth. */
export class RevealEffects {
  readonly object3D = new Group();
  private glow = veil(0.22, 0.22);
  private flare = veil(0.11, 0.11);
  private column = lightColumn();
  private sparkles: Points<BufferGeometry, ShaderMaterial>;

  constructor() {
    this.object3D.name = "DinosaurEffectRoot";
    this.glow.rotation.x = this.flare.rotation.x = -Math.PI / 2;
    this.glow.position.y = 0.002;
    this.flare.position.y = 0.003;
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
    this.object3D.add(this.glow, this.flare, this.column, this.sparkles);
    this.object3D.visible = false;
  }

  update(time: number, strength: number, reducedMotion: boolean, pixelRatio: number) {
    this.object3D.visible = strength > 0;
    this.glow.material.uniforms.strength!.value = strength * 0.45;
    this.flare.material.uniforms.strength!.value = strength * 0.55;
    const rise = Math.max(0, Math.min(1, (time - 1.2) / 0.75));
    this.column.visible = !reducedMotion && strength > 0.12;
    this.column.scale.y = Math.max(0.001, 1 - Math.pow(1 - rise, 3));
    this.column.material.uniforms.strength!.value = strength * 0.6;
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
