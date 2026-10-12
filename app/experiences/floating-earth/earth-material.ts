import { MeshBuilder, PBRMaterial, ShaderMaterial, Vector3, type AbstractMesh, type Scene, type TransformNode } from "@babylonjs/core";
const vertex = `precision highp float; attribute vec3 position; attribute vec3 normal; attribute vec2 uv;
uniform mat4 world; uniform mat4 worldViewProjection; uniform vec3 sun;
varying vec2 vUv; varying vec3 vNormal; varying vec3 vWorld; varying vec3 vLocalSun;
void main(){ vUv=uv; vNormal=normalize(mat3(world)*normal); vWorld=(world*vec4(position,1.)).xyz;
vLocalSun=vec3(dot(sun,normalize(world[0].xyz)),dot(sun,normalize(world[1].xyz)),dot(sun,normalize(world[2].xyz)));
gl_Position=worldViewProjection*vec4(position,1.); }`;
const common = `precision highp float; varying vec2 vUv; varying vec3 vNormal; varying vec3 vWorld; varying vec3 vLocalSun;
uniform vec3 sun; uniform vec3 eye; uniform sampler2D colorMap; uniform sampler2D cloudMap;`;
export function photographicEarth(scene: Scene, root: TransformNode, meshes: AbstractMesh[]) {
  const surface = meshes.find(mesh => /surface/i.test(mesh.name))!, clouds = meshes.find(mesh => /cloud/i.test(mesh.name))!;
  const colorMap = (surface?.material as PBRMaterial)?.albedoTexture, cloudMap = (clouds?.material as PBRMaterial)?.albedoTexture;
  if (!surface || !clouds || !colorMap || !cloudMap) throw new Error("Earth layers missing");
  const options = { attributes: ["position", "normal", "uv"], uniforms: ["world", "worldViewProjection", "sun", "eye"], samplers: ["colorMap", "cloudMap"] };
  const land = new ShaderMaterial("Photographic Earth", scene, { vertexSource: vertex, fragmentSource: common + `
void main(){ vec3 n=normalize(vNormal), light=normalize(sun); float daylight=max(dot(n,light),0.);
vec3 base=texture2D(colorMap,vUv).rgb;
float lon=(vUv.x-.5)*6.2831853, lat=(.5-vUv.y)*3.14159265;
vec3 tangent=vec3(cos(lon),0.,-sin(lon)), north=vec3(-sin(lat)*sin(lon),cos(lat),-sin(lat)*cos(lon));
vec2 offset=vec2(dot(vLocalSun,tangent)/max(cos(lat),.12)/6.2831853,-dot(vLocalSun,north)/3.14159265)*(.004/max(daylight,.24));
float occlusion=(texture2D(cloudMap,vUv+offset).a+texture2D(cloudMap,vUv+offset+vec2(.00035,0.)).a+texture2D(cloudMap,vUv+offset-vec2(.00035,0.)).a)/3.;
vec3 color=base*(.42+.92*daylight)*(1.-.23*occlusion*daylight); vec3 view=normalize(eye-vWorld);
float ocean=smoothstep(.001,.03,base.b-max(base.r,base.g)); float glint=pow(max(dot(n,normalize(light+view)),0.),65.);
color+=vec3(.13,.19,.25)*glint*ocean*(1.-occlusion); float rim=pow(1.-max(dot(n,view),0.),4.5);
color+=vec3(.012,.12,.42)*rim*(.3+.7*daylight); gl_FragColor=vec4(pow(max(color,vec3(0.)),vec3(1./2.2)),1.); }` }, options);
  const veil = new ShaderMaterial("Earth clouds", scene, { vertexSource: vertex, fragmentSource: common + `
void main(){ float opacity=texture2D(cloudMap,vUv).a; if(opacity<.003)discard;
float daylight=max(dot(normalize(vNormal),normalize(sun)),0.); vec3 color=vec3(.96,.985,1.)*(.43+.72*daylight);
gl_FragColor=vec4(pow(color,vec3(1./2.2)),opacity); }` }, { ...options, needAlphaBlending: true });
  const sun = new Vector3(-0.38, 0.4, 0.84).normalize();
  for (const mat of [land, veil]) { mat.setTexture("colorMap", colorMap); mat.setTexture("cloudMap", cloudMap); mat.setVector3("sun", sun); mat.setVector3("eye", new Vector3(0, 0, 5)); }
  veil.disableDepthWrite = true; surface.material = land; clouds.material = veil; clouds.isPickable = false;
  const atmosphere = MeshBuilder.CreateSphere("Blue atmosphere", { diameter: 2.05, segments: 48 }, scene);
  atmosphere.parent = root; atmosphere.isPickable = false;
  const air = new ShaderMaterial("Blue atmospheric rim", scene, { vertexSource: vertex, fragmentSource: common + `void main(){ float r=1.-abs(dot(normalize(vNormal),normalize(eye-vWorld))); gl_FragColor=vec4(.04,.3,1.,pow(r,7.)*.7); }` }, { ...options, needAlphaBlending: true });
  air.backFaceCulling = false; air.disableDepthWrite = true; air.setVector3("sun", sun); air.setVector3("eye", new Vector3(0, 0, 5)); atmosphere.material = air;
  scene.clearColor.set(0, 0, 0, 0);
  return surface;
}
