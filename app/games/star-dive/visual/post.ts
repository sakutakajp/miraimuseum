import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { Vector2, type WebGLRenderer, type Scene, type Camera } from "three";
export function createPost(
  renderer: WebGLRenderer,
  scene: Scene,
  camera: Camera,
) {
  const composer = new EffectComposer(renderer),
    bloom = new UnrealBloomPass(new Vector2(512, 512), 0.5, 0.4, 1);
  const finish = new ShaderPass({
    uniforms: {
      tDiffuse: { value: null },
      time: { value: 0 },
      aberration: { value: 0 },
    },
    vertexShader:
      "varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}",
    fragmentShader: `uniform sampler2D tDiffuse;uniform float time;uniform float aberration;varying vec2 vUv;void main(){vec2 d=(vUv-.5)*aberration;vec4 c=texture2D(tDiffuse,vUv);c.r=texture2D(tDiffuse,vUv+d).r;c.b=texture2D(tDiffuse,vUv-d).b;float vignette=1.-smoothstep(.2,.85,length(vUv-.5))*.28;float grain=(fract(sin(dot(vUv,vec2(12.9898,78.233))+floor(time*24.))*43758.5453)-.5)*.012;gl_FragColor=vec4(c.rgb*vignette+grain,c.a);}`,
  });
  composer.addPass(new RenderPass(scene, camera));
  composer.addPass(bloom);
  composer.addPass(finish);
  composer.addPass(new OutputPass());
  return {
    composer,
    bloom,
    finish,
    dispose() {
      for (const pass of composer.passes) pass.dispose();
      composer.dispose();
    },
  };
}
