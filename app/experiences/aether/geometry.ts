import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { PBRMaterial } from '@babylonjs/core/Materials/PBR/pbrMaterial';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture';
import type { Scene } from '@babylonjs/core/scene';
import type { Material } from '@babylonjs/core/Materials/material';
export function random(seed = 117) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
export function surface(scene: Scene, name: string, color: string, metal: number, roughness: number): PBRMaterial {
  const m = new PBRMaterial(name, scene); m.albedoColor = color3(color).toLinearSpace(); m.metallic = metal; m.roughness = roughness; m.environmentIntensity = .5; return m;
}
export const color3 = (hex: string) => Color3.FromHexString(hex);
export function stoneTexture(scene: Scene, normal = false) {
  const texture = new DynamicTexture(normal ? 'stone-normal' : 'stone-grain', 512, scene, true); const ctx = texture.getContext(); const image = new ImageData(512,512); const rng=random(77);
  for(let y=0;y<512;y++) for(let x=0;x<512;x++){const i=(y*512+x)*4;const a=rng();const vein=Math.sin(x*.028+Math.sin(y*.017)*3);const n=105+a*45+vein*13;image.data[i]=normal?126+vein*5:n;image.data[i+1]=normal?126+a*5:n+7;image.data[i+2]=normal?250:n+11;image.data[i+3]=255;}
  ctx.putImageData(image,0,0);texture.update();texture.uScale=4;texture.vScale=4;return texture;
}
export function arc(scene: Scene, name: string, radius: number, width: number, depth: number, from: number, to: number, material: Material, steps=64) {
  const positions:number[]=[],indices:number[]=[],uvs:number[]=[],normals:number[]=[];
  // Eight-sided bevelled cross section, made as an actual architectural profile.
  const cross=[[-.5,-.3],[-.3,-.5],[.3,-.5],[.5,-.3],[.5,.3],[.3,.5],[-.3,.5],[-.5,.3]];
  for(let i=0;i<=steps;i++){const a=from+(to-from)*i/steps;for(const [r,z] of cross){positions.push(Math.sin(a)*(radius+r!*width),Math.cos(a)*(radius+r!*width),z!*depth);uvs.push(i/steps*8,r!+.5);}}
  for(let i=0;i<steps;i++)for(let j=0;j<8;j++){const a=i*8+j,b=i*8+(j+1)%8,c=a+8,d=b+8;indices.push(a,b,c,b,d,c);}
  for(const end of [0,steps]) for(let j=1;j<7;j++) {const a=end*8;indices.push(a,a+j+(end?0:1),a+j+(end?1:0));}
  orientForBabylon(indices);VertexData.ComputeNormals(positions,indices,normals);const data=new VertexData();data.positions=positions;data.indices=indices;data.normals=normals;data.uvs=uvs;const mesh=new Mesh(name,scene);data.applyToMesh(mesh);mesh.material=material;return mesh;
}
export function crag(scene: Scene, name: string, position: Vector3, radius: number, height: number, rng:()=>number, material:Material) {
  const positions:number[]=[],indices:number[]=[],uvs:number[]=[],normals:number[]=[];const sides=11,levels=6;const jag=Array.from({length:sides},()=>rng()*.5+.75);
  for(let y=0;y<=levels;y++)for(let j=0;j<sides;j++){const a=j/sides*Math.PI*2;const shrink=1-y/levels*.16;const r=radius*jag[j]!*shrink*(.96+rng()*.08);positions.push(Math.sin(a)*r,(y/levels-.06)*height+(y===levels?rng()*height*.04:0),Math.cos(a)*r);uvs.push(j/sides,y/levels);}
  for(let y=0;y<levels;y++)for(let j=0;j<sides;j++){const a=y*sides+j,b=y*sides+(j+1)%sides;indices.push(a,b,a+sides,b,b+sides,a+sides);}for(let j=1;j<sides-1;j++)indices.push(levels*sides,levels*sides+j,levels*sides+j+1);
  orientForBabylon(indices);VertexData.ComputeNormals(positions,indices,normals);const data=new VertexData();data.positions=positions;data.indices=indices;data.normals=normals;data.uvs=uvs;const mesh=new Mesh(name,scene);data.applyToMesh(mesh);mesh.convertToFlatShadedMesh();mesh.position=position;mesh.material=material;mesh.receiveShadows=true;return mesh;
}

/** A stone with bevels on every edge, instead of a sharp-edged box. */
export function dressedStone(scene:Scene,name:string,width:number,height:number,depth:number,material:Material,bevel=.055){
  const positions:number[]=[],indices:number[]=[],uvs:number[]=[],normals:number[]=[];
  const b=Math.min(bevel,height*.23,width*.15,depth*.15),hx=width/2,hz=depth/2,hy=height/2;
  for(let k=0;k<4;k++){
    const inset=k===0||k===3?b:0,x=hx-inset,z=hz-inset,y=[-hy,-hy+b,hy-b,hy][k]!;
    const points=[[-x+b,-z],[x-b,-z],[x,-z+b],[x,z-b],[x-b,z],[-x+b,z],[-x,z-b],[-x,-z+b]];
    points.forEach(([px,pz],j)=>{positions.push(px!,y,pz!);uvs.push((px!/width)+.5,(pz!/depth)+.5);});
  }
  for(let k=0;k<3;k++)for(let j=0;j<8;j++){const a=k*8+j,c=k*8+(j+1)%8;indices.push(a,a+8,c,c,a+8,c+8);}
  for(let j=1;j<7;j++){indices.push(0,j,j+1,24,25+j,24+j);}
  orientForBabylon(indices);VertexData.ComputeNormals(positions,indices,normals);const data=new VertexData();data.positions=positions;data.indices=indices;data.normals=normals;data.uvs=uvs;
  const mesh=new Mesh(name,scene);data.applyToMesh(mesh);mesh.convertToFlatShadedMesh();mesh.material=material;mesh.receiveShadows=true;return mesh;
}
export function flutedShaft(scene:Scene,height:number,radius:number,material:Material,broken=false){
  const positions:number[]=[],indices:number[]=[],normals:number[]=[],uvs:number[]=[],sides=32;
  for(let y=0;y<3;y++)for(let j=0;j<sides;j++){const a=j/sides*Math.PI*2,r=radius*(j%2?.94:1);positions.push(Math.sin(a)*r,y===2?height-(broken?Math.sin(j*1.9)*.13+.16:0):y*height/2,Math.cos(a)*r);uvs.push(j/sides,y*.5);}
  for(let y=0;y<2;y++)for(let j=0;j<sides;j++){const a=y*sides+j,b=y*sides+(j+1)%sides;indices.push(a,b,a+sides,b,b+sides,a+sides);}
  for(let j=1;j<sides-1;j++)indices.push(sides*2,sides*2+j,sides*2+j+1);
  orientForBabylon(indices);VertexData.ComputeNormals(positions,indices,normals);const d=new VertexData();d.positions=positions;d.indices=indices;d.normals=normals;d.uvs=uvs;const m=new Mesh('fluted-sandstone-column',scene);d.applyToMesh(m);m.material=material;m.receiveShadows=true;return m;
}
export function stoneGrain(scene:Scene){
  const t=new DynamicTexture('limestone-grain',256,scene,true);const c=t.getContext();const data=new ImageData(256,256);const rng=random(314);
  for(let y=0;y<256;y++)for(let x=0;x<256;x++){const i=(y*256+x)*4,v=208+rng()*30+Math.sin(x*.09+Math.sin(y*.16))*.8;data.data[i]=v;data.data[i+1]=v;data.data[i+2]=v;data.data[i+3]=255;}c.putImageData(data,0,0);t.update();return t;
}

// Babylon's left handed system uses clockwise winding for outward-facing surfaces.
function orientForBabylon(indices:number[]){for(let i=0;i<indices.length;i+=3){const b=indices[i+1]!;indices[i+1]=indices[i+2]!;indices[i+2]=b;}}

export function cliffTextures(scene:Scene){
  const color=new DynamicTexture('weathered-cliff-strata',256,scene,true),normal=new DynamicTexture('cliff-relief',256,scene,true);
  const c=color.getContext(),n=normal.getContext(),pixels=new ImageData(256,256),normals=new ImageData(256,256),rng=random(665);
  for(let y=0;y<256;y++)for(let x=0;x<256;x++){const i=(y*256+x)*4;const rough=rng(),strata=Math.sin(y*.28+Math.sin(x*.033)*1.7),seam=Math.pow(Math.max(0.,Math.sin(x*.083+Math.sin(y*.06))),18.),moss=Math.sin(x*.03+Math.sin(y*.04))*Math.sin(y*.025+x*.013)>.42;const v=225+rough*22+strata*5-seam*20;pixels.data[i]=moss?v*.68:v;pixels.data[i+1]=moss?v*.78:v;pixels.data[i+2]=moss?v*.43:v;pixels.data[i+3]=255;normals.data[i]=127+Math.sin(x*.08)*5;normals.data[i+1]=127+Math.cos(y*.28)*8+rough*3;normals.data[i+2]=252;normals.data[i+3]=255;}
  c.putImageData(pixels,0,0);n.putImageData(normals,0,0);color.update();normal.update();color.uScale=2;color.vScale=3;normal.uScale=2;normal.vScale=3;normal.level=.24;return {color,normal};
}
