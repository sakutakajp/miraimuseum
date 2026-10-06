import { Color, ShaderMaterial, Vector2 } from "three";
export const NOISE = /* glsl */ `
float hash31(vec3 p) {
  p = fract(p * 0.1031);
  p += dot(p, p.yzx + 33.33);
  return fract((p.x + p.y) * p.z);
}
float noise3(vec3 p) {
  vec3 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(hash31(i), hash31(i+vec3(1,0,0)), f.x),
                 mix(hash31(i+vec3(0,1,0)), hash31(i+vec3(1,1,0)), f.x), f.y),
             mix(mix(hash31(i+vec3(0,0,1)), hash31(i+vec3(1,0,1)), f.x),
                 mix(hash31(i+vec3(0,1,1)), hash31(i+vec3(1,1,1)), f.x), f.y), f.z);
}
float terrain(vec3 p, float octaves) {
  float result = 0.0, weight = 0.55;
  for (int i=0; i<4; i++) {
    if (float(i) >= octaves) break;
    result += noise3(p) * weight;
    p = p * 2.07 + vec3(7.1, 3.8, 5.2); weight *= 0.48;
  }
  return result;
}
vec3 corePosition(vec3 direction, float morph, float clock, float strength, float octaves) {
  float life = smoothstep(1.1, 1.9, morph) * (1.0 - smoothstep(2.05, 2.85, morph));
  float matter = smoothstep(2.1, 2.9, morph) * (1.0 - smoothstep(3.1, 3.95, morph));
  float machine = smoothstep(3.1, 3.95, morph);
  float relief = terrain(direction * 3.15, octaves) - 0.45;
  float membrane = noise3(direction * 2.3 + vec3(clock * 0.025, 0, 0)) - 0.5;
  float facet = abs(noise3(direction * 5.0) - 0.5) * 1.6 - 0.26;
  float band = sin(direction.y * 36.0) * 0.045;
  float displacement = mix(relief, membrane, life * 0.8);
  displacement = mix(displacement, facet, matter * 0.75);
  displacement = mix(displacement, relief * 0.2 + band, machine * 0.85);
  displacement += life * sin(clock * 0.65 + direction.y * 2.0) * 0.016;
  vec3 p = direction * (1.0 + displacement * strength);
  p *= vec3(1.04, 1.16, 0.92);
  p.x += direction.y * direction.y * 0.055;
  return p;
}
`;
export function coreMaterial() {
  return new ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uMorph: { value: 0 },
      uDissolve: { value: 0 },
      uNoiseScale: { value: 3.15 },
      uNoiseStrength: { value: 0.3 },
      uRimStrength: { value: 0.3 },
      uColorA: { value: new Color("#77868e") },
      uColorB: { value: new Color("#b5bdaf") },
      uPointer: { value: new Vector2() },
      uVelocity: { value: 0 },
      uOctaves: { value: 4 },
      uReveal: { value: 1 },
    },
    vertexShader: /* glsl */ `
      uniform float uTime, uMorph, uNoiseStrength, uOctaves;
      varying vec3 vPosition, vWorld, vNormal;
      ${NOISE}
      void main() {
        vec3 p = corePosition(normalize(position), uMorph, uTime, uNoiseStrength, uOctaves);
        vPosition = p;
        vWorld = (modelMatrix * vec4(p, 1.0)).xyz;
        vNormal = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * viewMatrix * vec4(vWorld, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform float uTime, uMorph, uDissolve, uRimStrength, uVelocity, uReveal, uNoiseScale;
      uniform vec3 uColorA, uColorB;
      uniform vec2 uPointer;
      varying vec3 vPosition, vWorld, vNormal;
      ${NOISE}
      void main() {
        float breakup = noise3(vPosition * 7.0 + vec3(3.0));
        if (uDissolve > 0.0 && breakup < uDissolve) discard;
        float life = smoothstep(1.15, 1.9, uMorph) * (1.0 - smoothstep(2.05, 2.85, uMorph));
        float matter = smoothstep(2.1, 2.9, uMorph) * (1.0 - smoothstep(3.1, 3.95, uMorph));
        float machine = smoothstep(3.1, 3.95, uMorph);
        vec3 facetNormal = normalize(cross(dFdx(vWorld), dFdy(vWorld)));
        vec3 normal = normalize(mix(vNormal, facetNormal, 0.32 + matter * 0.67 - life * 0.23));
        vec3 view = normalize(cameraPosition - vWorld);
        vec3 key = normalize(vec3(-0.6 + uPointer.x * 0.045, 0.85, 0.85));
        vec3 fill = normalize(vec3(0.8, -0.3, -0.5));
        float relief = noise3(vPosition * uNoiseScale * 3.0);
        float pore = hash31(floor(vPosition * 370.0));
        float crevice = 0.72 + noise3(vPosition * 34.0) * 0.28;
        float diffuse = pow(max(dot(normal, key), 0.0), 1.25);
        float specular = pow(max(dot(normal, normalize(key + view)), 0.0), mix(38.0, 12.0, life));
        float rim = pow(1.0 - max(dot(normal, view), 0.0), 4.0);
        float grazing = max(dot(normal, key), 0.0);
        vec3 mineral = mix(uColorA, uColorB, life * 0.5 + matter * 0.35);
        vec3 color = mineral * (0.006 + diffuse * 0.24 + max(dot(normal, fill),0.0) * 0.016);
        color *= mix(0.52, 1.1, relief) * mix(0.78, 1.0, crevice) * (0.83 + pore * 0.28);
        color += vec3(0.72, 0.79, 0.82) * specular * mix(0.19, 0.06, life) * crevice;
        color += vec3(0.68, 0.76, 0.83) * rim * uRimStrength * (0.2 + grazing);
        // The lattice lives in the surface; it never becomes a wireframe globe.
        vec3 grid = abs(sin(vPosition * 24.0));
        float lattice = 1.0 - smoothstep(0.022, 0.075, min(grid.x, min(grid.y, grid.z)));
        color += vec3(0.34, 0.28, 0.17) * lattice * matter * 0.1 * (0.15 + diffuse);
        float path = 1.0 - smoothstep(0.018, 0.07, abs(sin(vPosition.y * 39.0)));
        float interrupted = step(0.25, noise3(floor(vPosition * 18.0)));
        color = mix(color, color * 0.55, machine * 0.35);
        color += vec3(0.16, 0.31, 0.34) * path * interrupted * machine * 0.24;
        color += vec3(0.04, 0.06, 0.07) * min(abs(uVelocity), 3.0) * rim * 0.015;
        color *= uReveal;
        gl_FragColor = vec4(color, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
}
