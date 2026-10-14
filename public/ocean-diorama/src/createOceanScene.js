import * as THREE from '../vendor/three.module.js?v=safari-1';
import { attachOceanBubble } from './oceanBubble.js?v=safari-1';
import { createOceanRenderer } from './createOceanRenderer.js?v=safari-1';
import { OrbitControls } from '../vendor/OrbitControls.js?v=safari-1';

/**
 * Miniature sea on a square white pedestal.
 * No source image is baked into the water: all waves and highlights animate in 3D.
 * Return controls and dispose() so this also works inside a Nuxt client component.
 */
export function createOceanScene(container, options = {}) {
  const isSmall = matchMedia("(pointer: coarse)").matches || container.clientWidth < 650;
  const scene = new THREE.Scene();
  scene.background = null; // Let the soft sky gradient show behind the 3D scene.

  const { renderer, reducedQuality } = createOceanRenderer();
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, reducedQuality ? 1 : isSmall ? 1.35 : 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setSize(container.clientWidth || 700, container.clientHeight || 600);
  container.appendChild(renderer.domElement);

  const camera = new THREE.OrthographicCamera(-6.9, 6.9, 6.9, -6.9, 0.1, 120);
  const initialCameraPosition = new THREE.Vector3(13.5, 13.4, 16.5);
  const target = new THREE.Vector3(0, -0.15, 0);
  camera.position.copy(initialCameraPosition);
  camera.lookAt(target);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.copy(target);
  controls.enableDamping = true;
  controls.dampingFactor = 0.07;
  controls.enablePan = false;
  controls.minZoom = 0.8;
  controls.maxZoom = 1.6;
  controls.minPolarAngle = 0.58;
  controls.maxPolarAngle = 1.18;
  controls.minAzimuthAngle = Math.atan2(initialCameraPosition.x, initialCameraPosition.z) - 0.22;
  controls.maxAzimuthAngle = Math.atan2(initialCameraPosition.x, initialCameraPosition.z) + 0.22;
  controls.update();

  scene.add(new THREE.HemisphereLight('#ecf7ff', '#94a7be', 2.0));
  const sun = new THREE.DirectionalLight('#fff9ef', 2.9);
  sun.position.set(10, 15, -5);
  sun.castShadow = true;
  const shadowSize = reducedQuality ? 512 : isSmall ? 1024 : 2048;
  sun.shadow.mapSize.set(shadowSize, shadowSize);
  sun.shadow.camera.left = -13;
  sun.shadow.camera.right = 13;
  sun.shadow.camera.top = 13;
  sun.shadow.camera.bottom = -13;
  sun.shadow.normalBias = 0.025;
  sun.shadow.bias = -0.0001;
  sun.shadow.radius = 4;
  scene.add(sun);

  // 2.5x original body thickness; keep the water and upper rim at their original height.
  const pedestalHeight = 0.55 * 2.5;
  const pedestalTop = -0.035;
  const pedestalBottom = pedestalTop - pedestalHeight;
  const pedestalMaterial = new THREE.MeshStandardMaterial({
    color: '#f8f9fb', roughness: 0.73, metalness: 0
  });
  // A recessed basin prevents wave troughs intersecting a solid white top face.
  const pedestalParts = [
    [8.7, 0.12, 8.7, 0, pedestalBottom + 0.06, 0],
    [8.7, pedestalHeight, 0.215, 0, pedestalTop - pedestalHeight / 2, -4.2425],
    [8.7, pedestalHeight, 0.215, 0, pedestalTop - pedestalHeight / 2, 4.2425],
    [0.215, pedestalHeight, 8.27, -4.2425, pedestalTop - pedestalHeight / 2, 0],
    [0.215, pedestalHeight, 8.27, 4.2425, pedestalTop - pedestalHeight / 2, 0],
  ];
  for (const [w, h, d, x, y, z] of pedestalParts) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), pedestalMaterial);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
  }

  // A very subtle *single* physical contact shadow, no fake cloud-like marks.
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(200, 200),
    new THREE.ShadowMaterial({ color: '#326daf', opacity: 0.22 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = pedestalBottom - 0.005;
  ground.receiveShadow = true;
  scene.add(ground);

  // Narrow white raised border around a square sea surface.
  const rimThickness = 0.135;
  const rimHeight = 0.070;
  const rimY = 0.0;
  const rimParts = [
    [8.7, rimHeight, rimThickness, 0, rimY, -4.2825],
    [8.7, rimHeight, rimThickness, 0, rimY,  4.2825],
    [rimThickness, rimHeight, 8.7, -4.2825, rimY, 0],
    [rimThickness, rimHeight, 8.7,  4.2825, rimY, 0]
  ];
  for (const [w, h, d, x, y, z] of rimParts) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), pedestalMaterial);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
  }

  const uniforms = {
    uTime: { value: 0 },
    uWaveHeight: { value: options.waveHeight ?? 0.28 },
    uWaveSpeed: { value: options.waveSpeed ?? 0.72 },
    uSparkle: { value: options.sparkle ?? 1.0 },
    uDeep: { value: new THREE.Color('#004789') },
    uShallow: { value: new THREE.Color('#08b5cf') },
  };

  const vertexShader = /* glsl */ `
    precision highp float;
    uniform float uTime;
    uniform float uWaveHeight;
    uniform float uWaveSpeed;
    varying vec2 vUv;
    varying vec2 vSurfacePoint;
    varying vec3 vWorldPoint;
    varying vec3 vWorldNormal;

    // A continuous, nonuniform wave-packet field. No frame-by-frame random noise.
    // Bent phase fronts and slowly moving envelopes break up parallel wave trains.
    // Derivatives include both effects so highlights track the actual geometry.
    vec3 wave(vec2 p, vec2 direction, float k, float amplitude, float phase) {
      vec2 d = normalize(direction);
      vec2 crossDir = vec2(-d.y, d.x);
      vec2 groupDir = normalize(d * 0.6 + crossDir * 0.8);
      float bendK = 0.34 + 0.055 * sqrt(k);
      float bendPhase = dot(p, crossDir) * bendK - uTime * 0.17 + phase * 1.73;
      float theta = dot(p, d) * k - uTime * sqrt(1.25 * k) + phase + 0.48 * sin(bendPhase);
      vec2 thetaGradient = d * k + crossDir * (0.48 * bendK * cos(bendPhase));
      float groupK = 0.27 + 0.06 * sqrt(k);
      float groupPhase = dot(p, groupDir) * groupK - uTime * (0.12 + 0.035 * sqrt(k)) + phase * 2.31;
      float packet = 0.82 + 0.35 * cos(groupPhase);
      vec2 packetGradient = -0.35 * sin(groupPhase) * groupK * groupDir;
      float h = sin(theta) - 0.13 * cos(2.0 * theta);
      float slope = cos(theta) + 0.26 * sin(2.0 * theta);
      return amplitude * vec3(h * packet, slope * thetaGradient * packet + h * packetGradient);
    }
    vec3 surface(vec2 p) {
      vec3 w = wave(p, vec2(0.987561, 0.157236), 1.666468, 0.300000, 0.784104);
      w += wave(p, vec2(0.921118, 0.389284), 1.821685, 0.270000, 5.100303);
      w += wave(p, vec2(0.479500, 0.877542), 2.420039, 0.230000, 2.425697);
      w += wave(p, vec2(0.891563, -0.452897), 2.938205, 0.190000, 6.013986);
      w += wave(p, vec2(0.918995, 0.394270), 3.318101, 0.160000, 2.221845);
      w += wave(p, vec2(-0.881655, 0.471894), 4.243112, 0.130000, 4.327607);
      w += wave(p, vec2(0.967571, 0.252598), 4.857132, 0.105000, 3.538122);
      w += wave(p, vec2(0.803973, -0.594666), 6.005016, 0.085000, 0.356148);
      w += wave(p, vec2(-0.360179, 0.932883), 7.060509, 0.068000, 0.861522);
      w += wave(p, vec2(0.649560, 0.760310), 8.354842, 0.053000, 1.021491);
      w += wave(p, vec2(0.424882, 0.905249), 10.598106, 0.042000, 4.433172);
      w += wave(p, vec2(0.034162, 0.999416), 12.626340, 0.032000, 5.432458);
      w += wave(p, vec2(0.960286, -0.279018), 14.432066, 0.025000, 3.001187);
      w += wave(p, vec2(0.998459, -0.055499), 16.788110, 0.018000, 4.382809);
      w += wave(p, vec2(0.750220, 0.661188), 20.633056, 0.012000, 5.993901);
      w += wave(p, vec2(0.376002, 0.926619), 26.273536, 0.008000, 3.119874);
      vec2 q = clamp((vec2(4.135) - abs(p)) / 0.62, 0.0, 1.0);
      vec2 fade = q * q * (3.0 - 2.0 * q);
      vec2 derivative = -sign(p) * 6.0 * q * (1.0 - q) / 0.62;
      float envelope = fade.x * fade.y;
      vec2 gradient = vec2(derivative.x * fade.y, derivative.y * fade.x);
      return uWaveHeight * vec3(w.x * envelope, w.yz * envelope + w.x * gradient);
    }

    void main() {
      vUv = uv;
      vSurfacePoint = position.xy;
      vec3 field = surface(position.xy);
      vec3 displaced = position;
      displaced.z = field.x;
      vec3 localNormal = normalize(vec3(-field.yz, 1.0));
      vWorldNormal = normalize(mat3(modelMatrix) * localNormal);
      vec4 wPos = modelMatrix * vec4(displaced, 1.0);
      vWorldPoint = wPos.xyz;
      gl_Position = projectionMatrix * viewMatrix * wPos;
    }
  `;

  const fragmentShader = /* glsl */ `
    precision highp float;
    uniform float uTime;
    uniform float uWaveSpeed;
    uniform float uSparkle;
    uniform vec3 uDeep;
    uniform vec3 uShallow;
    varying vec2 vUv;
    varying vec2 vSurfacePoint;
    varying vec3 vWorldPoint;
    varying vec3 vWorldNormal;

    void main() {
      float t = uTime;
      vec2 p = vSurfacePoint;
      // Wind-aligned fine ripples, softly filtered when smaller than a pixel.
      float footprint = max(length(dFdx(p)), length(dFdy(p)));
      float fine = 1.0 - smoothstep(0.025, 0.12, footprint);
      vec2 warped = p + 0.075 * vec2(
        sin(p.y * 3.2 + p.x * 1.8 - t * 0.65),
        sin(p.x * 2.4 - p.y * 1.3 + t * 0.48));
      float r1 = cos(dot(warped, vec2(22.4, 7.6)) - t * 5.4);
      float r2 = sin(dot(warped, vec2(-12.2, 29.8)) - t * 6.6);
      float r3 = cos(dot(warped, vec2(42.0, -15.2)) - t * 8.0);
      float r4 = sin(dot(warped, vec2(18.3, 51.2)) - t * 9.2);
      vec2 ripple = vec2(0.095, 0.032) * r1 + vec2(-0.032, 0.079) * r2;
      ripple += (vec2(0.040, -0.015) * r3 + vec2(0.010, 0.028) * r4) * fine;
      float ripplePatch = 0.62 + 0.20 * sin(p.x * 0.91 + p.y * 0.57 - t * 0.19)
                               + 0.18 * sin(p.y * 1.37 - p.x * 0.42 + t * 0.13);
      vec3 N = normalize(vWorldNormal + vec3(ripple.x, 0.0, -ripple.y) * 0.55 * ripplePatch);
      // Orthographic view rays are parallel, unlike a perspective camera.
      vec3 V = normalize(vec3(viewMatrix[0][2], viewMatrix[1][2], viewMatrix[2][2]));
      vec3 L = normalize(vec3(10.0, 15.0, -5.0));
      float ndotl = max(dot(N, L), 0.0);

      // Pale turquoise toward the front/right, deeper marine blue at the back.
      float aqua = clamp(0.02 + 0.48 * (1.0 - vUv.y) + 0.28 * vUv.x, 0.0, 1.0);
      float waveTint = 0.052 * sin(p.x * 2.7 - p.y * 3.15 + t * 0.73)
                     + 0.033 * sin(p.x * 6.7 + p.y * 2.9 - t * 1.16);
      vec3 color = mix(uDeep, uShallow, clamp(aqua + waveTint, 0.0, 1.0));
      // Broad, coherent slopes carry the volume; tiny highlights are secondary.
      float bodyLight = max(dot(normalize(vWorldNormal), L), 0.0);
      color *= 0.48 + 0.52 * bodyLight;
      float trough = smoothstep(-0.22, 0.16, vWorldPoint.y - 0.037);
      color *= mix(0.70, 1.06, trough);
      // Stronger transmitted turquoise on the sunlit, near side of the miniature.
      float crestLight = smoothstep(-0.10, 0.20, vWorldPoint.y);
      color += uShallow * crestLight * 0.035;

      // Water Fresnel reflectance plus a procedural sky reflection.
      float fresnel = 0.02 + 0.98 * pow(1.0 - clamp(dot(N, V), 0.0, 1.0), 5.0);
      vec3 reflectedView = reflect(-V, N);
      float skyHeight = smoothstep(-0.08, 0.85, reflectedView.y);
      vec3 sky = mix(vec3(0.68, 0.86, 1.0), vec3(0.13, 0.40, 0.72), skyHeight);
      // Bright extended patches of sky stretch into thin reflections on each ripple.
      // These follow the reflection vector rather than being painted white onto the water.
      vec2 skyUV = reflectedView.xz / max(0.18, reflectedView.y + 0.65);
      float clouds = sin(skyUV.x * 7.0 + sin(skyUV.y * 4.0))
                   + 0.45 * sin(skyUV.y * 11.0 - skyUV.x * 3.0);
      float cloudBand = smoothstep(0.98, 1.30, clouds);
      sky = mix(sky, vec3(1.15, 1.35, 1.55), cloudBand * 0.30 * uSparkle);
      color = mix(color, sky, fresnel * 0.65);
      vec3 H = normalize(L + V);
      float nh = max(dot(N, H), 0.0);
      float broad = pow(nh, 64.0) * 0.08;
      // A finite sun highlight with footprint filtering keeps moving glints readable.
      float tight = pow(nh, mix(420.0, 180.0, clamp(footprint * 6.0, 0.0, 1.0)));
      color += vec3(1.0, 0.97, 0.89) * (broad + tight * 2.0) * uSparkle;
      // No artificial reflection ribbon: it produced repeating white bands
      // across the entire surface in the supplied phone screenshot.

      gl_FragColor = vec4(color, 1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }
  `;

  // Higher subdivisions = smooth geometry, even in close view.
  const subdivisions = isSmall ? 100 : 185;
  const water = new THREE.Mesh(
    new THREE.PlaneGeometry(8.27, 8.27, subdivisions, subdivisions),
    new THREE.ShaderMaterial({
      uniforms, vertexShader, fragmentShader,
      side: THREE.DoubleSide, toneMapped: true,
    })
  );
  water.rotation.x = -Math.PI / 2;
  water.position.y = 0.037;
  water.frustumCulled = false; // vertices displace beyond original bounding box
  scene.add(water);
  const oceanBubble = attachOceanBubble({ container, canvas: renderer.domElement, scene, camera, water });

  function resize() {
    const w = Math.max(1, container.clientWidth);
    const h = Math.max(1, container.clientHeight);
    const aspect = w / h;
    const visibleHeight = 13.4;
    camera.left = (-visibleHeight * aspect) / 2;
    camera.right = (visibleHeight * aspect) / 2;
    camera.top = visibleHeight / 2;
    camera.bottom = -visibleHeight / 2;
    // Narrow screens: keep the entire square pedestal visible without crop.
    if (aspect < 1) {
      const extra = 1 / aspect;
      camera.top *= extra;
      camera.bottom *= extra;
      camera.left *= extra;
      camera.right *= extra;
    }
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
  }

  const observer = new ResizeObserver(resize);
  observer.observe(container);
  resize();

  let playing = true;
  let rafId = 0;
  let lastTime = performance.now();
  function animate(now) {
    if (document.hidden) return;
    rafId = requestAnimationFrame(animate);
    const dt = Math.min((now - lastTime) / 1000, 0.06);
    lastTime = now;
    if (playing) uniforms.uTime.value += dt * uniforms.uWaveSpeed.value;
    controls.update();
    renderer.render(scene, camera);
    oceanBubble.update();
  }
  function onVisibility() {
    cancelAnimationFrame(rafId);
    if (!document.hidden) {
      lastTime = performance.now();
      rafId = requestAnimationFrame(animate);
    }
  }
  document.addEventListener('visibilitychange', onVisibility);
  rafId = requestAnimationFrame(animate);

  return {
    setWaveHeight(value) { uniforms.uWaveHeight.value = Number(value); },
    setWaveSpeed(value) { uniforms.uWaveSpeed.value = Number(value); },
    setSparkle(value) { uniforms.uSparkle.value = Number(value); },
    setPlaying(value) { playing = Boolean(value); },
    resetView() {
      camera.zoom = 1;
      camera.updateProjectionMatrix();
      camera.position.copy(initialCameraPosition);
      controls.target.copy(target);
      controls.update();
    },
    dispose() {
      cancelAnimationFrame(rafId);
      document.removeEventListener('visibilitychange', onVisibility);
      observer.disconnect();
      controls.dispose();
      oceanBubble.dispose();
      scene.traverse((object) => {
        if (object.geometry) object.geometry.dispose();
        if (object.material && object.material !== pedestalMaterial) {
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          for (const m of materials) m.dispose();
        }
      });
      pedestalMaterial.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
