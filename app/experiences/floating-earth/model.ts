import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const vertexShader = `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vWorld;
  varying vec3 vLocalSun;
  uniform vec3 sun;
  void main() {
    vUv = uv;
    vNormal = normalize(mat3(modelMatrix) * normal);
    vWorld = (modelMatrix * vec4(position, 1.0)).xyz;
    vLocalSun = vec3(dot(sun, normalize(modelMatrix[0].xyz)),
      dot(sun, normalize(modelMatrix[1].xyz)), dot(sun, normalize(modelMatrix[2].xyz)));
    gl_Position = projectionMatrix * viewMatrix * vec4(vWorld, 1.0);
  }`;

const common = `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vWorld;
  varying vec3 vLocalSun;
  uniform vec3 sun;
  uniform sampler2D colorMap;
  uniform sampler2D cloudMap;
`;

/** Release shared GLB geometry, images and shader textures exactly once. */
export function disposeEarthObjects(group: THREE.Object3D) {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();
  group.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    geometries.add(object.geometry);
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
      materials.add(material);
      for (const value of Object.values(material)) if (value instanceof THREE.Texture) textures.add(value);
      if (material instanceof THREE.ShaderMaterial) {
        for (const uniform of Object.values(material.uniforms)) {
          if (uniform.value instanceof THREE.Texture) textures.add(uniform.value);
        }
      }
    }
  });
  geometries.forEach((geometry) => geometry.dispose());
  materials.forEach((material) => material.dispose());
  textures.forEach((texture) => {
    const image = texture.source.data;
    texture.dispose();
    if (typeof ImageBitmap !== "undefined" && image instanceof ImageBitmap) image.close();
  });
}

/** Exact supplied GLB; the website adds lighting, cloud shadows and atmosphere. */
export async function loadPhotographicEarth(signal?: AbortSignal): Promise<THREE.Group> {
  const response = await fetch("/floating-earth/earth-vivid.glb", { signal });
  if (!response.ok) throw new Error("Could not load the Earth model");
  const bytes = await response.arrayBuffer();
  signal?.throwIfAborted();
  const gltf = await new GLTFLoader().parseAsync(bytes, "/floating-earth/");
  const earth = gltf.scene;
  try {
    signal?.throwIfAborted();
    // GLTFLoader sanitizes spaces in node names.
    const meshes: THREE.Mesh[] = [];
    earth.traverse((object) => { if (object instanceof THREE.Mesh) meshes.push(object); });
    const surface = meshes.find((mesh) => /surface/i.test(mesh.name));
    const clouds = meshes.find((mesh) => /cloud/i.test(mesh.name));
    if (!surface || !clouds) throw new Error("Earth surface or cloud layer is missing");
    const surfaceMaterial = surface.material as THREE.MeshStandardMaterial;
    const cloudMaterial = clouds.material as THREE.MeshStandardMaterial;
    const surfaceMap = surfaceMaterial.map;
    const cloudMap = cloudMaterial.map;
    if (!surfaceMap || !cloudMap) throw new Error("Earth textures are missing");
    surfaceMap.anisotropy = cloudMap.anisotropy = 4;
    const sun = new THREE.Vector3(-0.38, 0.4, 0.84).normalize();
    const uniforms = {
      sun: { value: sun },
      colorMap: { value: surfaceMap },
      cloudMap: { value: cloudMap },
    };
    surface.material = new THREE.ShaderMaterial({
      name: "Photographic Earth / cloud shadows",
      uniforms, vertexShader, toneMapped: false,
      fragmentShader: common + `
        void main() {
          vec3 n = normalize(vNormal);
          vec3 light = normalize(sun);
          float daylight = max(dot(n, light), 0.0);
          vec3 base = texture2D(colorMap, vUv).rgb;
          // Trace toward the sun through a cloud shell at 1.004 Earth radii.
          // UV offset is derived in the rotating globe's local tangent frame,
          // so the shadow stays registered while the user drags the globe.
          float lon = (vUv.x - 0.5) * 6.28318530718;
          float lat = (0.5 - vUv.y) * 3.14159265359;
          vec3 tangent = vec3(cos(lon), 0.0, -sin(lon));
          vec3 north = vec3(-sin(lat)*sin(lon), cos(lat), -sin(lat)*cos(lon));
          float height = 0.004 / max(daylight, 0.24);
          vec2 offset = vec2(dot(vLocalSun, tangent) / max(cos(lat), 0.12) / 6.2831853,
            -dot(vLocalSun, north) / 3.14159265) * height;
          float occlusion = texture2D(cloudMap, vUv + offset).a;
          occlusion += texture2D(cloudMap, vUv + offset + vec2(0.00035, 0.0)).a;
          occlusion += texture2D(cloudMap, vUv + offset - vec2(0.00035, 0.0)).a;
          occlusion /= 3.0;
          vec3 color = base * (0.42 + 0.92 * daylight) * (1.0 - 0.23 * occlusion * daylight);
          vec3 eye = normalize(cameraPosition - vWorld);
          float ocean = smoothstep(0.015, 0.10, base.b - max(base.r, base.g));
          float glint = pow(max(dot(n, normalize(light + eye)), 0.0), 65.0);
          color += vec3(0.13, 0.19, 0.25) * glint * ocean * (1.0 - occlusion);
          float rim = pow(1.0 - max(dot(n, eye), 0.0), 4.5);
          color += vec3(0.012, 0.12, 0.42) * rim * (0.3 + 0.7 * daylight);
          gl_FragColor = vec4(color, 1.0);
          #include <colorspace_fragment>
        }`,
    });
    clouds.material = new THREE.ShaderMaterial({
      name: "Photographic Earth / translucent clouds",
      uniforms, vertexShader, transparent: true, depthWrite: false, toneMapped: false,
      fragmentShader: common + `
        void main() {
          float opacity = texture2D(cloudMap, vUv).a;
          if (opacity < 0.003) discard;
          float daylight = max(dot(normalize(vNormal), normalize(sun)), 0.0);
          vec3 color = vec3(0.96, 0.985, 1.0) * (0.43 + 0.72 * daylight);
          gl_FragColor = vec4(color, opacity);
          #include <colorspace_fragment>
        }`,
    });
    clouds.renderOrder = 2;
    surfaceMaterial.dispose();
    cloudMaterial.dispose();
    earth.name = "PhotographicEarth";
    // The existing interaction owns rotation. Do not play the GLB's 15s clip,
    // which would compete with drag, tap and reduced-motion preferences.
    return earth;
  } catch (error) {
    disposeEarthObjects(earth);
    throw error;
  }
}
