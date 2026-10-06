import {
  BackSide,
  Color,
  ShaderMaterial,
  Vector2,
  Vector4,
  type Texture,
} from "three";

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
vec2 earthUv(vec3 p) {
  vec3 d = normalize(p);
  return vec2(fract(atan(d.z, -d.x) / 6.28318530718), asin(clamp(d.y,-1.0,1.0)) / 3.14159265359 + 0.5);
}
float earthBreakup(vec3 p) { return noise3(normalize(p) * 7.0 + vec3(3.0)); }
`;

export interface EarthTextures {
  day: Texture;
  relief: Texture;
  night: Texture;
  clouds: Texture;
}

export function coreMaterial(textures: EarthTextures) {
  return new ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uDissolve: { value: 0 },
      uLight: { value: 0 },
      uLayers: { value: new Vector4() },
      uRimStrength: { value: 0.3 },
      uPointer: { value: new Vector2() },
      uVelocity: { value: 0 },
      uOctaves: { value: 4 },
      uReveal: { value: 1 },
      uDay: { value: textures.day },
      uRelief: { value: textures.relief },
      uNight: { value: textures.night },
      uClouds: { value: textures.clouds },
      uOcean: { value: new Color("#203c49") },
    },
    vertexShader: /* glsl */ `
      varying vec3 vPosition, vWorld, vNormal;
      void main() {
        // Every observation uses exactly the same sphere. No morph or layer displacement.
        vec3 p = normalize(position);
        vPosition = p;
        vWorld = (modelMatrix * vec4(p, 1.0)).xyz;
        vNormal = normalize(mat3(modelMatrix) * p);
        gl_Position = projectionMatrix * viewMatrix * vec4(vWorld, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform float uTime, uDissolve, uRimStrength, uVelocity, uReveal, uLight, uOctaves;
      uniform vec4 uLayers;
      uniform vec3 uOcean;
      uniform vec2 uPointer;
      uniform sampler2D uDay, uRelief, uNight, uClouds;
      varying vec3 vPosition, vWorld, vNormal;
      ${NOISE}
      vec3 reliefNormal(float height, vec3 n) {
        vec3 dx = dFdx(vWorld), dy = dFdy(vWorld);
        vec3 r1 = cross(dy, n), r2 = cross(n, dx);
        float det = dot(dx, r1);
        return normalize(abs(det) * n - sign(det) * (dFdx(height) * r1 + dFdy(height) * r2));
      }
      void main() {
        if (uDissolve > 0.0 && earthBreakup(vPosition) < uDissolve) discard;
        vec2 uv = earthUv(vPosition);
        vec4 relief = texture2D(uRelief, uv);
        float land = relief.b;
        float height = relief.r;
        vec3 geography = texture2D(uDay, uv).rgb;
        float luma = dot(geography, vec3(0.2126, 0.7152, 0.0722));
        // NASA geography remains readable, graded as a museum object rather than a stock globe.
        vec3 albedo = mix(vec3(luma), geography, 0.60);
        albedo = mix(uOcean * (0.7 + luma * 1.4), albedo * vec3(0.85, 0.83, 0.74), land);
        vec3 normal = reliefNormal(height * 0.0025, normalize(vNormal));
        vec3 view = normalize(cameraPosition - vWorld);
        vec3 key = normalize(vec3(-0.85 + uPointer.x * 0.035, 0.48, 0.62));
        float incidence = dot(normal, key);
        float day = smoothstep(-0.08, 0.22, incidence);
        float diffuse = max(incidence, 0.0);
        float fresnel = pow(1.0 - max(dot(normal, view), 0.0), 5.0);
        float seaReflection = pow(max(dot(normal, normalize(key + view)),0.0), 95.0) * (1.0-land);
        float cloud = texture2D(uClouds, vec2(uv.x + uTime * 0.00028, uv.y)).r;
        cloud = smoothstep(0.10, 0.86, cloud) * 0.75;
        vec3 color = albedo * (0.008 + diffuse * mix(0.025, 0.92, uLight));
        color *= 1.0 - cloud * day * 0.16;
        color += vec3(0.47, 0.56, 0.59) * seaReflection * mix(0.08, 0.23, uLight);
        // At the threshold only a cold rim, cloud fragments and tiny sea glints escape the dark.
        color += vec3(0.52, 0.63, 0.70) * fresnel * uRimStrength * (0.09 + max(incidence,0.0) * 0.28);
        color = mix(color, vec3(0.61,0.64,0.62) * (0.015 + diffuse * mix(0.022,0.61,uLight)), cloud * 0.68);
        color += vec3(0.11, 0.13, 0.14) * cloud * fresnel * 0.045;

        // LIFE: vegetation and coastal/plankton filaments stay attached to real geography.
        if (uLayers.x > 0.01) {
        float vegetation = relief.g * land;
        float organic = uOctaves > 2.5 ? noise3(vPosition*38.0 + vec3(uTime*0.011,0,0)) : 0.0;
        float filament = 1.0-smoothstep(0.008,0.045,abs(organic-0.5));
        float oceanLife = (1.0-land) * (uOctaves > 2.5 ? smoothstep(0.55,0.72,noise3(vPosition*6.0)) : 0.0);
        color += vec3(0.045,0.081,0.038) * vegetation * uLayers.x * day;
        color += vec3(0.035,0.070,0.067) * filament * oceanLife * uLayers.x * day * 0.26;

        }
        // MATTER: local strata, mineral seams and facets intrude into the surface, never a cutaway.
        if (uLayers.y > 0.01) {
        float mineralPatch = smoothstep(0.47,0.68,noise3(vPosition*4.2+vec3(5.0))) * land;
        float strata = 1.0-smoothstep(0.025,0.11,abs(sin(height*87.0+(uOctaves > 2.5 ? noise3(vPosition*17.0)*2.5 : 0.0))));
        vec3 cell = abs(sin(vPosition*29.0 + (uOctaves > 3.5 ? noise3(vPosition*8.0)*1.7 : 0.0)));
        float crystal = 1.0-smoothstep(0.016,0.055,min(cell.x,min(cell.y,cell.z)));
        float mineral = (strata*0.6+crystal*0.3)*mineralPatch*uLayers.y;
        color += vec3(0.19,0.145,0.077) * mineral * (0.10+diffuse);
        color = mix(color,color*0.74,mineralPatch*uLayers.y*0.24);
        float glint = pow(max(dot(normal,normalize(key+view)),0.0),75.0);
        color += vec3(0.45,0.39,0.26)*glint*mineralPatch*uLayers.y*0.08;

        }
        // MACHINE: an inhabited, artificial stratum. Warm light follows real cities on the night side.
        if (uLayers.z > 0.01) {
        vec3 cities = texture2D(uNight,uv).rgb;
        float city = dot(cities,vec3(0.2126,0.7152,0.0722));
        city = pow(max(city-0.035,0.0),1.15);
        color += vec3(0.68,0.42,0.17) * city * (1.0-day*0.95) * uLayers.z * 0.40;
        float infrastructure = (1.0-smoothstep(0.006,0.027,abs(sin(uv.y*740.0+(uOctaves > 2.5 ? noise3(vPosition*21.0)*9.0 : 0.0))))) * city;
        color += vec3(0.26,0.22,0.16) * infrastructure * day * uLayers.z * 0.25;
        }
        color += vec3(0.04,0.05,0.055) * min(abs(uVelocity),3.0) * fresnel * 0.012;
        gl_FragColor = vec4(color*uReveal, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
}

export function atmosphereMaterial() {
  return new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: BackSide,
    uniforms: {
      uReveal: { value: 0 },
      uLight: { value: 0 },
      uDissolve: { value: 0 },
    },
    vertexShader: /* glsl */ `
      varying vec3 vWorld, vNormal, vPosition;
      void main(){
        vPosition=normalize(position);
        vWorld=(modelMatrix*vec4(position,1.0)).xyz;
        vNormal=normalize(mat3(modelMatrix)*normal);
        gl_Position=projectionMatrix*viewMatrix*vec4(vWorld,1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform float uReveal,uLight,uDissolve;
      varying vec3 vWorld,vNormal,vPosition;
      ${NOISE}
      void main(){
        if(uDissolve>0.0 && earthBreakup(vPosition)<uDissolve) discard;
        vec3 n=normalize(vNormal), view=normalize(cameraPosition-vWorld);
        float rim=pow(1.0-abs(dot(n,view)),3.0);
        float light=max(dot(n,normalize(vec3(-.85,.48,.62))),0.0);
        float alpha=rim*(.055+light*.34)*uReveal;
        gl_FragColor=vec4(mix(vec3(.25,.36,.43),vec3(.32,.47,.58),uLight),alpha);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
}
