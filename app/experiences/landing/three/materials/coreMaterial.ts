import { BackSide, Color, ShaderMaterial, Vector4, type Texture } from "three";

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
    // Photograph colors go directly to sRGB, without the scene's filmic grading.
    toneMapped: false,
    uniforms: {
      uTime: { value: 0 },
      uDissolve: { value: 0 },
      uVisibility: { value: 0 },
      uLayers: { value: new Vector4() },
      uOctaves: { value: 4 },
      uReveal: { value: 1 },
      uDay: { value: textures.day },
      uRelief: { value: textures.relief },
      uNight: { value: textures.night },
      uClouds: { value: textures.clouds },
      uOcean: { value: new Color("#26336f") },
      uOceanShelf: { value: new Color("#3b4b95") },
      uCloudColor: { value: new Color("#e4e6ee") },
    },
    vertexShader: /* glsl */ `
      varying vec3 vPosition;
      void main() {
        // Every observation uses exactly the same sphere. No morph or layer displacement.
        vec3 p = normalize(position);
        vPosition = p;
        gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(p, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform float uTime, uDissolve, uReveal, uVisibility, uOctaves;
      uniform vec4 uLayers;
      uniform vec3 uOcean, uOceanShelf, uCloudColor;
      uniform sampler2D uDay, uRelief, uNight, uClouds;
      varying vec3 vPosition;
      ${NOISE}
      void main() {
        if (uDissolve > 0.0 && earthBreakup(vPosition) < uDissolve) discard;
        vec2 uv = earthUv(vPosition);
        vec4 relief = texture2D(uRelief, uv);
        float land = relief.b;
        float height = relief.r;
        vec3 geography = texture2D(uDay, uv).rgb;
        float luma = dot(geography, vec3(0.2126, 0.7152, 0.0722));
        // Reference-photo palette with ungraded geographic greens, ochres and snow.
        // Water variation follows the source map, never a lamp or viewing angle.
        vec3 ocean = mix(uOcean, uOceanShelf, smoothstep(0.002, 0.065, luma));
        vec3 color = mix(ocean, geography, land);
        vec2 cloudUv = vec2(uv.x + uTime * 0.00022, uv.y);
        // Cloud opacity has its own baked detail, with no relighting or cast shadows.
        vec3 cloudField = texture2D(uClouds, cloudUv).rgb;
        float cloudBody = smoothstep(0.035, 0.78, cloudField.r);
        float cirrus = cloudField.b * 0.38;
        float cloud = clamp(cloudBody * 0.97 + cirrus, 0.0, 0.97);

        // LIFE: vegetation and coastal/plankton filaments stay attached to real geography.
        if (uLayers.x > 0.01) {
        float vegetation = relief.g * land;
        float organic = uOctaves > 2.5 ? noise3(vPosition*38.0 + vec3(uTime*0.011,0,0)) : 0.0;
        float filament = 1.0-smoothstep(0.008,0.045,abs(organic-0.5));
        float oceanLife = (1.0-land) * (uOctaves > 2.5 ? smoothstep(0.55,0.72,noise3(vPosition*6.0)) : 0.0);
        color += vec3(0.025,0.046,0.019) * vegetation * uLayers.x;
        color += vec3(0.022,0.033,0.042) * filament * oceanLife * uLayers.x * 0.16;

        }
        // MATTER: local strata, mineral seams and facets intrude into the surface, never a cutaway.
        if (uLayers.y > 0.01) {
        float mineralPatch = smoothstep(0.47,0.68,noise3(vPosition*4.2+vec3(5.0))) * land;
        float strata = 1.0-smoothstep(0.025,0.11,abs(sin(height*87.0+(uOctaves > 2.5 ? noise3(vPosition*17.0)*2.5 : 0.0))));
        vec3 cell = abs(sin(vPosition*29.0 + (uOctaves > 3.5 ? noise3(vPosition*8.0)*1.7 : 0.0)));
        float crystal = 1.0-smoothstep(0.016,0.055,min(cell.x,min(cell.y,cell.z)));
        float mineral = (strata*0.6+crystal*0.3)*mineralPatch*uLayers.y;
        color += vec3(0.19,0.145,0.077) * mineral * 0.16;
        color = mix(color,color*0.74,mineralPatch*uLayers.y*0.24);

        }
        // MACHINE: actual city locations form an artificial stratum over the same photograph colors.
        if (uLayers.z > 0.01) {
        vec3 cities = texture2D(uNight,uv).rgb;
        float city = dot(cities,vec3(0.2126,0.7152,0.0722));
        city = pow(max(city-0.035,0.0),1.15);
        color += vec3(0.68,0.42,0.17) * city * uLayers.z * 0.22;
        float infrastructure = (1.0-smoothstep(0.006,0.027,abs(sin(uv.y*740.0+(uOctaves > 2.5 ? noise3(vPosition*21.0)*9.0 : 0.0))))) * city;
        color += vec3(0.26,0.22,0.16) * infrastructure * uLayers.z * 0.18;
        }
        // Every observation is a surface layer, beneath the same cloud cover.
        color = mix(color, uCloudColor, cloud);
        // Threshold is a uniform fade of the same colors, never a simulated day/night boundary.
        gl_FragColor = vec4(color * mix(0.006, 1.0, uVisibility) * uReveal, 1.0);
        #include <colorspace_fragment>
      }`,
  });
}

export function atmosphereMaterial() {
  return new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: BackSide,
    toneMapped: false,
    uniforms: {
      uReveal: { value: 0 },
      uVisibility: { value: 0 },
      uDissolve: { value: 0 },
      uColor: { value: new Color("#53608e") },
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
      uniform float uReveal,uVisibility,uDissolve;
      uniform vec3 uColor;
      varying vec3 vWorld,vNormal,vPosition;
      ${NOISE}
      void main(){
        if(uDissolve>0.0 && earthBreakup(vPosition)<uDissolve) discard;
        vec3 n=normalize(vNormal), view=normalize(cameraPosition-vWorld);
        float rim=pow(1.0-abs(dot(n,view)),3.0);
        float alpha=rim*mix(.05,.13,uVisibility)*uReveal;
        gl_FragColor=vec4(uColor,alpha);
        #include <colorspace_fragment>
      }`,
  });
}
