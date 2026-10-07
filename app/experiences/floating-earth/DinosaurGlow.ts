import {
  AdditiveBlending, BackSide, Group, Mesh, MeshStandardMaterial, ShaderMaterial,
} from "three";

function halo(width: number, strength: number) {
  return new ShaderMaterial({
    name: "White dinosaur aura",
    uniforms: { width: { value: width }, strength: { value: strength }, appearance: { value: 0 } },
    transparent: true, depthTest: true, depthWrite: false, side: BackSide,
    blending: AdditiveBlending, toneMapped: false,
    vertexShader: `
      #include <common>
      #include <morphtarget_pars_vertex>
      #include <skinning_pars_vertex>
      uniform float width;
      varying vec3 auraNormal;
      varying vec3 auraView;
      void main() {
        #include <morphinstance_vertex>
        #include <beginnormal_vertex>
        #include <morphnormal_vertex>
        #include <skinbase_vertex>
        #include <skinnormal_vertex>
        #include <begin_vertex>
        #include <morphtarget_vertex>
        #include <skinning_vertex>
        auraNormal = normalize(normalMatrix * objectNormal);
        vec4 viewPosition = modelViewMatrix * vec4(transformed, 1.0);
        auraView = -viewPosition.xyz;
        viewPosition.xyz += auraNormal * width;
        gl_Position = projectionMatrix * viewPosition;
      }`,
    fragmentShader: `
      uniform float strength;
      uniform float appearance;
      varying vec3 auraNormal;
      varying vec3 auraView;
      void main() {
        float rim = pow(1.0 - abs(dot(normalize(auraNormal), normalize(auraView))), 2.0);
        gl_FragColor = vec4(vec3(1.0), rim * strength * appearance);
        #include <colorspace_fragment>
      }`,
  });
}

export function addWhiteRim(material: MeshStandardMaterial) {
  material.onBeforeCompile = shader => {
    shader.fragmentShader = shader.fragmentShader.replace("#include <emissivemap_fragment>", `
      #include <emissivemap_fragment>
      float dinosaurRim = pow(1.0 - abs(dot(normal, normalize(vViewPosition))), 3.0);
      totalEmissiveRadiance += vec3(0.65) * dinosaurRim;
    `);
  };
  material.customProgramCacheKey = () => "dinosaur-white-rim-v1";
}

/** Aura shells share each mesh's geometry and rig, including future animation. */
export class DinosaurGlow {
  private materials = [halo(0.003, 0.45), halo(0.009, 0.14)];

  constructor(scene: Group) {
    const meshes: Mesh[] = [];
    scene.traverse(object => { if (object instanceof Mesh) meshes.push(object); });
    for (const mesh of meshes) {
      for (const material of this.materials) {
        const shell = mesh.clone(false);
        shell.name = "DinosaurAura";
        shell.material = material;
        shell.userData.effect = true;
        shell.raycast = () => {};
        mesh.parent!.add(shell);
      }
    }
  }

  update(opacity: number) {
    for (const material of this.materials) material.uniforms.appearance!.value = opacity;
  }
}
