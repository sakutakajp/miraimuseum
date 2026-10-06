<script setup lang="ts">
const positions = new Float32Array(
  Array.from({ length: 240 }, (_, i) => [
    Math.sin(i * 37) * 25,
    Math.cos(i * 19) * 18,
    -5 - (i % 35) * 1.7,
  ]).flat(),
);
const vertexShader = `varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`;
const fragmentShader = `varying vec2 vUv;
void main(){
 vec2 p=(vUv-.5)*vec2(4.54545,5.55555)+.5;
 float cloud=exp(-dot((p-vec2(.28,.65))*vec2(2.3,5.0),(p-vec2(.28,.65))*vec2(2.3,5.0)));
 float blue=exp(-dot((p-vec2(.76,.25))*vec2(4.0,3.5),(p-vec2(.76,.25))*vec2(4.0,3.5)));
 float wisps=.7+.3*sin(p.x*25.0+p.y*17.0+sin(p.y*23.0));
 vec3 color=vec3(.022,.033,.095)+cloud*wisps*vec3(.12,.045,.21)+blue*vec3(.015,.12,.16);
 gl_FragColor=vec4(color,1.0);
}`;
</script>
<template>
  <TresAmbientLight :intensity="0.9" />
  <TresDirectionalLight
    :position="[3, 5, 5]"
    :intensity="2.6"
    color="#e6f5ff"
  />
  <TresPointLight
    :position="[-5, 3, 6]"
    :intensity="25"
    color="#9088ff"
    :distance="35"
  />
  <TresMesh :position="[0, 0, -65]"
    ><TresPlaneGeometry :args="[1000, 1000]" /><TresShaderMaterial
      :vertex-shader="vertexShader"
      :fragment-shader="fragmentShader"
      :depth-write="false"
  /></TresMesh>
  <TresPoints>
    <TresBufferGeometry
      ><TresBufferAttribute attach="attributes-position" :args="[positions, 3]"
    /></TresBufferGeometry>
    <TresPointsMaterial
      color="#c5e7ff"
      :size="0.07"
      :size-attenuation="true"
      transparent
      :opacity="0.85"
    />
  </TresPoints>
  <TresGroup :position="[8, 5, -43]" :rotation="[0.3, 0, -0.35]">
    <TresMesh
      ><TresSphereGeometry :args="[4.1, 32, 24]" /><TresMeshStandardMaterial
        color="#39698f"
        :roughness="0.8"
    /></TresMesh>
    <TresMesh :rotation="[Math.PI / 2, 0, 0]"
      ><TresTorusGeometry :args="[6, 0.14, 8, 64]" /><TresMeshBasicMaterial
        color="#80bdd6"
        transparent
        :opacity="0.35"
    /></TresMesh>
    <TresMesh :rotation="[Math.PI / 2, 0, 0]"
      ><TresTorusGeometry :args="[6.5, 0.06, 6, 64]" /><TresMeshBasicMaterial
        color="#b5d9e7"
        transparent
        :opacity="0.4"
    /></TresMesh>
  </TresGroup>
</template>
