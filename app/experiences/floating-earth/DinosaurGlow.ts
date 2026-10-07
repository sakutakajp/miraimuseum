import {
  AdditiveBlending, Camera, Color, Group, Material, Mesh, MeshBasicMaterial,
  NoBlending, Object3D, OrthographicCamera, PlaneGeometry, Scene, ShaderMaterial,
  Vector2, WebGLRenderer, WebGLRenderTarget,
} from "three";

/** Mark the actual skinned surfaces. No expanded geometry or transparent shells. */
export class DinosaurGlow {
  private appearance = { value: 0 };
  constructor(scene: Group) {
    scene.traverse(object => {
      if (object instanceof Mesh) object.userData.dinosaurRim = this.appearance;
    });
  }
  update(opacity: number) { this.appearance.value = opacity; }
}

const fullscreenVertex = `varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

/** Selective screen-space bloom. The globe writes depth but never emits bloom. */
export class DinosaurBloom {
  private mask = new WebGLRenderTarget(1, 1);
  private horizontal = new WebGLRenderTarget(1, 1, { depthBuffer: false });
  private blurred = new WebGLRenderTarget(1, 1, { depthBuffer: false });
  private size = new Vector2();
  private black = new MeshBasicMaterial({ color: 0x000000, toneMapped: false });
  private rim = new ShaderMaterial({
    name: "Dinosaur surface rim mask",
    uniforms: { appearance: { value: 0 } },
    blending: NoBlending, depthTest: true, depthWrite: true, toneMapped: false,
    vertexShader: `
      #include <common>
      #include <morphtarget_pars_vertex>
      #include <skinning_pars_vertex>
      varying vec3 rimNormal;
      varying vec3 rimView;
      void main() {
        #include <morphinstance_vertex>
        #include <beginnormal_vertex>
        #include <morphnormal_vertex>
        #include <skinbase_vertex>
        #include <skinnormal_vertex>
        #include <begin_vertex>
        #include <morphtarget_vertex>
        #include <skinning_vertex>
        rimNormal = normalize(normalMatrix * objectNormal);
        vec4 viewPosition = modelViewMatrix * vec4(transformed, 1.0);
        rimView = -viewPosition.xyz;
        gl_Position = projectionMatrix * viewPosition;
      }`,
    fragmentShader: `
      uniform float appearance;
      varying vec3 rimNormal;
      varying vec3 rimView;
      void main() {
        vec3 viewDirection = isOrthographic ? vec3(0.0, 0.0, 1.0) : normalize(rimView);
        float edge = pow(1.0 - abs(dot(normalize(rimNormal), viewDirection)), 3.0);
        gl_FragColor = vec4(vec3(smoothstep(0.08, 0.85, edge) * appearance), 1.0);
      }`,
  });
  private blur = new ShaderMaterial({
    depthTest: false, depthWrite: false, toneMapped: false,
    uniforms: { source: { value: this.mask.texture }, step: { value: new Vector2() } },
    vertexShader: fullscreenVertex,
    fragmentShader: `varying vec2 vUv; uniform sampler2D source; uniform vec2 step;
      void main() {
        vec3 color = texture2D(source, vUv).rgb * 0.227027;
        color += texture2D(source, vUv + step * 1.384615).rgb * 0.316216;
        color += texture2D(source, vUv - step * 1.384615).rgb * 0.316216;
        color += texture2D(source, vUv + step * 3.230769).rgb * 0.070270;
        color += texture2D(source, vUv - step * 3.230769).rgb * 0.070270;
        gl_FragColor = vec4(color, 1.0);
      }`,
  });
  private composite = new ShaderMaterial({
    transparent: true, blending: AdditiveBlending,
    depthTest: false, depthWrite: false, toneMapped: false,
    uniforms: { sharp: { value: this.mask.texture }, soft: { value: this.blurred.texture } },
    vertexShader: fullscreenVertex,
    fragmentShader: `varying vec2 vUv; uniform sampler2D sharp; uniform sampler2D soft;
      void main() {
        vec3 light = texture2D(sharp, vUv).rgb * 1.15 + texture2D(soft, vUv).rgb * 2.8;
        gl_FragColor = vec4(light, 1.0);
        #include <colorspace_fragment>
      }`,
  });
  private quad = new Mesh(new PlaneGeometry(2, 2), this.blur);
  private screen = new Scene();
  private camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);

  constructor() { this.quad.frustumCulled = false; this.screen.add(this.quad); }

  render(renderer: WebGLRenderer, scene: Scene, camera: Camera) {
    let appearance = 0;
    scene.traverseVisible(object => {
      if (object instanceof Mesh && object.userData.dinosaurRim) {
        appearance = Math.max(appearance, object.userData.dinosaurRim.value);
      }
    });
    if (appearance <= 0) return;
    renderer.getDrawingBufferSize(this.size);
    // Half resolution keeps the two blur passes affordable on phones.
    const width = Math.max(1, Math.ceil(this.size.x / 2));
    const height = Math.max(1, Math.ceil(this.size.y / 2));
    if (this.mask.width !== width || this.mask.height !== height) {
      for (const target of [this.mask, this.horizontal, this.blurred]) target.setSize(width, height);
    }
    this.rim.uniforms.appearance!.value = appearance;
    const target = renderer.getRenderTarget();
    const autoClear = renderer.autoClear;
    const clearColor = renderer.getClearColor(new Color());
    const clearAlpha = renderer.getClearAlpha();
    const background = scene.background;
    const materials: Array<[Mesh, Material | Material[]]> = [];
    const hidden: Object3D[] = [];
    try {
      scene.background = null;
      scene.traverseVisible(object => {
        if (object instanceof Mesh) {
          const original = object.material;
          if (object.userData.dinosaurRim) {
            materials.push([object, original]);
            object.material = this.rim;
          } else if ((Array.isArray(original) ? original : [original]).some(m => m.transparent)) {
            hidden.push(object);
          } else {
            materials.push([object, original]);
            object.material = this.black;
          }
        } else if ("material" in object) hidden.push(object);
      });
      for (const object of hidden) object.visible = false;
      renderer.autoClear = true;
      renderer.setClearColor(0x000000, 0);
      renderer.setRenderTarget(this.mask);
      renderer.render(scene, camera);
      for (const [mesh, material] of materials) mesh.material = material;
      for (const object of hidden) object.visible = true;
      scene.background = background;
      const radius = renderer.getPixelRatio() * 1.5;
      this.quad.material = this.blur;
      this.blur.uniforms.source!.value = this.mask.texture;
      this.blur.uniforms.step!.value.set(radius / width, 0);
      renderer.setRenderTarget(this.horizontal);
      renderer.render(this.screen, this.camera);
      this.blur.uniforms.source!.value = this.horizontal.texture;
      this.blur.uniforms.step!.value.set(0, radius / height);
      renderer.setRenderTarget(this.blurred);
      renderer.render(this.screen, this.camera);
      renderer.setRenderTarget(target);
      renderer.autoClear = false;
      this.quad.material = this.composite;
      renderer.render(this.screen, this.camera);
    } finally {
      for (const [mesh, material] of materials) mesh.material = material;
      for (const object of hidden) object.visible = true;
      scene.background = background;
      renderer.setRenderTarget(target);
      renderer.autoClear = autoClear;
      renderer.setClearColor(clearColor, clearAlpha);
    }
  }

  dispose() {
    for (const target of [this.mask, this.horizontal, this.blurred]) target.dispose();
    for (const material of [this.black, this.rim, this.blur, this.composite]) material.dispose();
    this.quad.geometry.dispose();
  }
}
