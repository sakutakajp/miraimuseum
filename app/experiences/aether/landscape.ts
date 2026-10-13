import { Scene } from '@babylonjs/core/scene';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import { Vector3, Matrix, Quaternion } from '@babylonjs/core/Maths/math.vector';
import { Color3, Color4 } from '@babylonjs/core/Maths/math.color';
import { PBRMaterial } from '@babylonjs/core/Materials/PBR/pbrMaterial';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { ShaderMaterial } from '@babylonjs/core/Materials/shaderMaterial';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture';
import { ParticleSystem } from '@babylonjs/core/Particles/particleSystem';
import { PointLight } from '@babylonjs/core/Lights/pointLight';
import { Constants } from '@babylonjs/core/Engines/constants';
import type { Material } from '@babylonjs/core/Materials/material';
import '@babylonjs/core/Meshes/thinInstanceMesh';
import { arc, crag, dressedStone, flutedShaft, random, surface, stoneGrain, cliffTextures, color3 } from './geometry';
import { fallVertex, fallFragment } from './shaders';
export interface Shrine { root:TransformNode; flame:Mesh; halo:Mesh; light:PointLight; active:boolean; name:string; }
export interface Ruins { shrines:Shrine[]; avatar:TransformNode; legs:TransformNode[]; falls:ShaderMaterial[]; particles:ParticleSystem[]; staticMeshes:Mesh[]; foliage:Mesh[]; shores:number[]; flameMaterial:StandardMaterial; activeMaterial:StandardMaterial; }
const TAU=Math.PI*2;
export function buildRuins(scene:Scene,mobile:boolean):Ruins{
  const rng=random(907),staticMeshes:Mesh[]=[],foliage:Mesh[]=[],falls:ShaderMaterial[]=[],particles:ParticleSystem[]=[],shores:number[]=[],shrines:Shrine[]=[];
  const grain=stoneGrain(scene);
  const stone=Array.from({length:6},(_,i)=>{const m=surface(scene,'honey-limestone-'+i,['#D6BB8A','#CFB589','#E3C896','#C2A779','#DBC390','#CBB182'][i]!,0,.9);m.albedoTexture=grain;return m;});
  const cliff=Array.from({length:4},(_,i)=>surface(scene,'blue-gray-cliff-'+i,['#698286','#7F9391','#829591','#869A94'][i]!,0,.92));
  const rockTextures=cliffTextures(scene);cliff.forEach(m=>{m.albedoTexture=rockTextures.color;m.bumpTexture=rockTextures.normal;});
  const moss=surface(scene,'soft-moss','#6E8136',0,1),bark=surface(scene,'olive-bark','#655C3E',0,.95),gold=surface(scene,'aged-brass','#AB8B42',.65,.46);
  const green=Array.from({length:5},(_,i)=>{const m=surface(scene,'olive-canopy-'+i,['#3A541B','#556B25','#7C862B','#314717','#627A29'][i]!,0,.94);m.backFaceCulling=false;return m;});
  const add=(m:Mesh,casts=true)=>{m.metadata={casts};m.receiveShadows=true;staticMeshes.push(m);return m;};
  const block=(x:number,y:number,z:number,w:number,h:number,d:number,mat:Material=stone[Math.floor(rng()*stone.length)]!,bevel=.06)=>{const m=dressedStone(scene,'weathered-cut-stone',w,h,d,mat,bevel);m.position.set(x,y,z);return add(m);};
  const trunk=(a:Vector3,b:Vector3,r:number)=>{const m=MeshBuilder.CreateCylinder('crooked-olive-branch',{height:Vector3.Distance(a,b),diameterTop:r*.65,diameterBottom:r,tessellation:5},scene);m.position=Vector3.Center(a,b);m.rotationQuaternion=Quaternion.FromUnitVectorsToRef(Vector3.Up(),b.subtract(a).normalize(),new Quaternion());m.material=bark;return add(m);};
  // Repeated canopies and leaves use true GPU instances, one buffer for each color.
  const canopyMatrices=green.map(()=>[] as Matrix[]),leafMatrices=green.map(()=>[] as Matrix[]);
  function canopy(x:number,y:number,z:number,size:number){const index=Math.floor(rng()*green.length);canopyMatrices[index]!.push(Matrix.Compose(new Vector3(size*(.75+rng()*.5),size*(.5+rng()*.35),size*(.7+rng()*.5)),Quaternion.RotationYawPitchRoll(rng()*TAU,rng(),rng()),new Vector3(x,y,z)));}
  function leaf(x:number,y:number,z:number,size:number,index:number){leafMatrices[index%green.length]!.push(Matrix.Compose(new Vector3(size,size,size),Quaternion.RotationYawPitchRoll(rng()*TAU,rng()*2-1,rng()*1.5),new Vector3(x,y,z)));}
  function shrub(x:number,y:number,z:number,size=.8){for(let i=0;i<7;i++)canopy(x+(rng()-.5)*size*1.5,y+.18+rng()*size*.65,z+(rng()-.5)*size*1.5,size*(.28+rng()*.3));}
  function tree(x:number,y:number,z:number,size=1){trunk(new Vector3(x,y,z),new Vector3(x+.22*size,y+3.3*size,z),.36*size);for(let j=0;j<5;j++){const a=j/5*TAU+1,xx=x+Math.cos(a)*1.3*size,zz=z+Math.sin(a)*1.3*size,yy=y+(3.8+rng())*size;trunk(new Vector3(x+.1,y+2.3*size,z),new Vector3(xx,yy,zz),.2*size);for(let k=0;k<10;k++)canopy(xx+(rng()-.5)*1.7*size,yy+(rng()-.5)*size,zz+(rng()-.5)*1.7*size,.55*size+rng()*.3*size);}}
  function cypress(x:number,y:number,z:number,height:number){trunk(new Vector3(x,y,z),new Vector3(x,y+height*.5,z),.22);for(let j=0;j<4;j++){const m=MeshBuilder.CreateCylinder('faceted-cypress',{height:height*.44,diameterTop:.06,diameterBottom:height*(.22-j*.035),tessellation:7},scene);m.position.set(x+(rng()-.5)*.12,y+height*(.28+j*.2),z);m.material=green[j%green.length]!;add(m);}}
  function vine(x:number,y:number,z:number,length:number){const path:Vector3[]=[];for(let j=0;j<9;j++)path.push(new Vector3(x+Math.sin(j*.7)*.13,y-j/8*length,z+Math.sin(j)*.09));const tube=MeshBuilder.CreateTube('trailing-ivy-stem',{path,radius:.026,tessellation:4},scene);tube.material=green[3]!;add(tube);for(let j=0;j<Math.floor(length*9);j++){const yy=y-j/Math.floor(length*9)*length;leaf(x+Math.sin(j*1.7)*.15,yy,z+Math.cos(j)*.1,.45+rng()*.35,j);if(j%2===0)leaf(x+.2,yy-.06,z,.6,j+1);}}
  function column(x:number,y:number,z:number,height=5,broken=false){block(x,y+.13,z,1.65,.26,1.65);block(x,y+.4,z,1.35,.28,1.35);const shaft=flutedShaft(scene,height,.51,stone[2]!,broken);shaft.position.set(x,y+.54,z);add(shaft);if(!broken){block(x,y+height+.68,z,1.32,.3,1.32);block(x,y+height+.97,z,1.74,.26,1.74);}else{for(let i=0;i<3;i++)block(x+(rng()-.5)*.8,y+height+.53,z+(rng()-.5)*.7,.5,.25,.65);}}
  function platform(cx:number,cz:number,w:number,d:number){
    block(cx,8.9,cz,w,.7,d,stone[3]!, .14);
    const cols=Math.floor(w/1.04),rows=Math.floor(d/1.04);for(let i=0;i<cols;i++)for(let j=0;j<rows;j++){const m=block(cx-w/2+.53+i*1.04,9.46+(rng()-.5)*.014,cz-d/2+.53+j*1.04,1,.29,1);m.rotation.y=(rng()-.5)*.023;}
    for(let i=0;i<cols;i++)for(const side of [-1,1])block(cx-w/2+.52+i*1.04,9.63,cz+side*d/2,1.02,.5,.44);
  }
  // The bridge is built from separate voussoirs, piers, wall courses and paving stones.
  platform(-21,0,13,13);platform(21,3,14,18);
  for(let i=0;i<30;i++)for(let j=0;j<4;j++)block(-14.5+i,9.44,-1.58+j*1.04,.96,.31,1);
  for(const x of [-12,-4,4,12]){
    for(let y=0;y<9;y++)for(let z=0;z<3;z++)block(x+(y%2?.06:-.02),.56+y*.94,-1.1+z*1.1,1.36,.91,1.06,stone[(y+z)%6]!,.07);
    block(x,5.01,0,2.15,.5,4.2);block(x,8.94,0,2.0,.42,4.4);
  }
  for(const center of [-8,0,8]){
    for(const side of [-1,1]){
      for(let j=0;j<14;j++){const a=-Math.PI/2+j/14*Math.PI+.007,b=-Math.PI/2+(j+1)/14*Math.PI-.007;const stoneArc=arc(scene,'bridge-voussoir',3.46,.65,.78,a,b,stone[(j+2)%6]!,3);stoneArc.position.set(center,5.0,side*1.7);add(stoneArc);}
      for(let j=0;j<8;j++){const offset=-3.5+j;const low=5+Math.sqrt(Math.max(0,3.7**2-offset**2));const h=Math.max(.22,9.2-low);block(center+offset,low+h/2,side*1.7,.97,h,.74,stone[j%6]!, .04);}
      for(let j=0;j<8;j++)block(center-3.5+j,9.72,side*2.05,.96,.59,.48);
    }
  }
  for(const x of [-14,-8,0,8,14])for(const side of [-1,1]){block(x,10.07,side*2.08,.78,.5,.74);block(x,10.38,side*2.08,.92,.17,.88);}
  for(const [x,z,l] of [[-12,-2.23,3.4],[-7,-2.23,2.1],[4,-2.23,4.2],[9,-2.23,3.3],[13,2.24,3.8],[-25,-6.55,3.1],[23,-6.1,4.5],[27,4,3.8]]){for(let j=0;j<4;j++)vine(x!+j*.19,9.8,z!,l!*(.65+rng()*.5));shrub(x!,9.73,z!+.12,.75);}
  // Walkable courtyards rest on cliffs; the water remains visibly far below them.
  for(const [x,z,r,h] of [[-21,0,9.4,9.6],[21,3,11,9.6],[-29,9,5.5,13.5],[28,15,7,17],[-16,25,6,19],[-4,24,7.5,25],[7,28,6.5,22],[20,34,7,24],[-28,31,6,24]]){
    const m=crag(scene,'terraced-island-cliff',new Vector3(x!,-.8,z!),r!,h!,rng,cliff[Math.floor(rng()*4)]!);add(m);shores.push(x!,z!,r!*.92,0);
    for(let j=0;j<18;j++){const a=j<10?2.5+j/9*2:rng()*TAU,rr=r!*(.45+rng()*.4);const xx=x!+Math.cos(a)*rr,zz=z!+Math.sin(a)*rr;const small=crag(scene,'stratified-rock-stack',new Vector3(xx,-.7,zz),.75+rng()*1.3,h!*(.4+rng()*.6),rng,cliff[j%4]!);add(small);if(j%3===0)shrub(xx,h!*.65,zz,1);}
  }
  // Offshore stacks carry islands of moss and foam at their base.
  for(let i=0;i<35;i++){const x=(rng()-.5)*80,z=-21+rng()*65;if(Math.abs(z)<5&&Math.abs(x)<15)continue;const r=.7+rng()*2.1,h=1.5+rng()*5;const m=crag(scene,'sea-stack',new Vector3(x,-.7,z),r,h,rng,cliff[i%4]!);add(m);if(i<7)shores.push(x,z,r*.92,0);if(i%2===0)shrub(x,h*.92,z,r*.6);}
  while(shores.length<64)shores.push(10000,10000,0,0);shores.length=64;
  for(let i=0;i<24;i++){const x=(i%2?1:-1)*(30+rng()*42),z=36+rng()*70,h=25+rng()*25;const m=crag(scene,'distant-canyon',new Vector3(x,-1,z),7+rng()*10,h,rng,cliff[i%4]!);add(m,false);if(i%3===0)tree(x,h*.84,z,1.5);}
  const westFore=crag(scene,'foreground-island',new Vector3(-30,-.6,-10),5.3,12,rng,cliff[1]!);add(westFore);const eastFore=crag(scene,'foreground-island',new Vector3(33,-.6,-11),5.1,8,rng,cliff[2]!);add(eastFore);
  // Pillar gardens, broken entablatures and the open temple on the eastern terrace.
  column(-25,9.65,4,5.3);column(-18.5,9.65,4.7,2.1,true);column(-25,9.65,-4,1.4,true);column(-16.5,9.65,-4.4,2.7,true);
  for(const x of [18,25.7])for(const z of [7.4,10.0])column(x,9.65,z,5.8,z===7.4&&x===18);
  block(21.8,16.48,10,10.2,.65,1.72);block(21.8,16.9,10,10.5,.21,1.95);
  column(28,9.65,-3,2.8,true);column(16,9.65,-4,1.7,true);column(25.4,9.65,0,4.2);
  for(let i=0;i<22;i++){const x=(i<11?-25:25)+(rng()-.5)*4,z=(i<11?4:7)+(rng()-.5)*5;const m=block(x,9.91,z,.65+rng()*.6,.3+rng()*.6,.55+rng()*.7);m.rotation.y=rng()*3;}
  // Older ruins punctuate the canyon behind the main bridge.
  for(const [x,y,z] of [[-17,18,25],[-22,19,29],[-2,25,27],[6,22,30],[21,23,35]]){column(x!,y!,z!,3.5+rng()*2,rng()>.5);platformSmall(x!,y!,z!);}
  function platformSmall(x:number,y:number,z:number){for(let i=0;i<3;i++)for(let j=0;j<3;j++)block(x-1.4+i*1.15,y,z-1.4+j*1.15,1.12,.24,1.12);}
  // Low terraces and a smaller bridge in the distance reinforce the canyon's scale.
  for(let x=-25;x<-12;x++)block(x,13.5,19,1.02,.42,2.7);for(const x of [-23,-15]){const a=arc(scene,'old-aqueduct-arch',3.4,.7,.8,-Math.PI/2,Math.PI/2,stone[1]!,24);a.position.set(x+4,9.8,18);add(a);for(let y=4;y<13;y++)block(x,y+.4,19,1.3,.78,2.4);}
  // Abundant foliage: distinct canopy silhouettes, cypresses, ivy and tiny meadow plants.
  for(const [x,y,z,size] of [[-25,9.7,1.2,1],[-18,9.7,5,1.1],[27,9.7,8,1.05],[18,9.7,9,1],[31,15,17,1.2],[-15,18,25,1.05],[-1,24,27,1],[11,21,32,1.2],[-30,12,9,1.3],[-30,11,-10,1.7],[33,7,-11,1.9]])tree(x!,y!,z!,size!);
  for(const [x,y,z,h] of [[-27,9.7,5,8],[-19,9.7,5.8,6],[-16,18,26,7],[21,9.7,10,7],[25,9.7,10.8,8],[17,22,32,6]])cypress(x!,y!,z!,h!);
  for(let i=0;i<110;i++){const left=i%2===0,cx=left?-21:21,w=left?13:14,d=left?13:18,cz=left?0:3;const a=rng()*TAU;const x=cx+Math.cos(a)*w*.48,z=cz+Math.sin(a)*d*.48;shrub(x,9.7,z,.55+rng()*.65);for(let j=0;j<7;j++)leaf(x+(rng()-.5)*1.3,9.68,z+(rng()-.5)*1.3,.35+rng()*.55,j);}
  for(let i=0;i<35;i++){const x=-13+rng()*26,side=rng()>.5?1:-1;shrub(x,9.77,side*2.15,.4+rng()*.3);}
  for(let i=0;i<green.length;i++){
    const cluster=MeshBuilder.CreateIcoSphere('instanced-leaf-canopies-'+i,{radius:1,subdivisions:mobile?1:2,flat:true},scene);cluster.material=green[i]!;cluster.receiveShadows=true;cluster.thinInstanceSetBuffer('matrix',Float32Array.from(canopyMatrices[i]!.flatMap(m=>Array.from(m.m))),16,true);cluster.thinInstanceRefreshBoundingInfo();foliage.push(cluster);
    const data=new VertexData();data.positions=[0,0,0,-.14,.18,.025,0,.38,.075,.14,.18,.025];data.indices=[0,2,1,0,3,2];const normals:number[]=[];VertexData.ComputeNormals(data.positions as number[],data.indices as number[],normals);data.normals=normals;const leafMesh=new Mesh('instanced-ivy-leaves-'+i,scene);data.applyToMesh(leafMesh);leafMesh.material=green[i]!;leafMesh.receiveShadows=true;leafMesh.thinInstanceSetBuffer('matrix',Float32Array.from(leafMatrices[i]!.flatMap(m=>Array.from(m.m))),16,true);leafMesh.thinInstanceRefreshBoundingInfo();foliage.push(leafMesh);
  }
  const softTexture=new DynamicTexture('soft-mist',64,scene,false);const c=softTexture.getContext(),g=c.createRadialGradient(32,32,0,32,32,31);g.addColorStop(0,'rgba(255,255,255,.8)');g.addColorStop(.4,'rgba(255,255,255,.3)');g.addColorStop(1,'rgba(255,255,255,0)');c.fillStyle=g;c.fillRect(0,0,64,64);softTexture.update();
  for(const [x,z,width,height] of [[-4,16,4.2,24],[-26,22,2.5,17],[26,24,3.4,19]]){
    block(x!,height!-.3,z!+1.3,width!+1.5,.65,3.8,cliff[1]!,.18);
    const stream=MeshBuilder.CreateGround('stream-on-the-cliff',{width:width!,height:4.5},scene);stream.position.set(x!,height!+.06,z!+1.8);stream.material=surface(scene,'upper-turquoise-stream-'+falls.length,'#4FABB0',.12,.21);
    const positions:number[]=[],uvs:number[]=[],indices:number[]=[],normals:number[]=[];
    for(let j=0;j<=20;j++)for(let k=0;k<=4;k++){const v=j/20,u=k/4;positions.push(x!+(u-.5)*width!*(1+v*.16),height!*(1-v),z!-Math.sin(v*Math.PI)*.8-v*.5);uvs.push(u,v);}
    for(let j=0;j<20;j++)for(let k=0;k<4;k++){const a=j*5+k;indices.push(a,a+1,a+5,a+1,a+6,a+5);}
    VertexData.ComputeNormals(positions,indices,normals);const d=new VertexData();d.positions=positions;d.indices=indices;d.uvs=uvs;d.normals=normals;const fall=new Mesh('cascading-waterfall',scene);d.applyToMesh(fall);const mat=new ShaderMaterial('flowing-water-'+falls.length,scene,{vertexSource:fallVertex,fragmentSource:fallFragment},{attributes:['position','uv'],uniforms:['worldViewProjection','time','seed'],needAlphaBlending:true});mat.backFaceCulling=false;mat.disableDepthWrite=true;mat.setFloat('seed',rng()*20);fall.material=mat;falls.push(mat);
    const mist=new ParticleSystem('waterfall-spray',mobile?70:180,scene);mist.particleTexture=softTexture;mist.emitter=new Vector3(x!,.35,z!-.5);mist.minEmitBox=new Vector3(-width!*.4,0,-.7);mist.maxEmitBox=new Vector3(width!*.4,.4,.6);mist.minSize=.4;mist.maxSize=1.6;mist.minLifeTime=1.5;mist.maxLifeTime=3;mist.emitRate=mobile?12:25;mist.color1=new Color4(.76,.94,.91,.28);mist.color2=new Color4(.9,1,1,.19);mist.colorDead=new Color4(.8,1,1,0);mist.direction1=new Vector3(-.25,.7,-.12);mist.direction2=new Vector3(.25,1,.15);mist.minEmitPower=.2;mist.maxEmitPower=.5;mist.blendMode=ParticleSystem.BLENDMODE_STANDARD;mist.start();particles.push(mist);
  }
  const flameMaterial=new StandardMaterial('sleeping-shrine-light',scene);flameMaterial.diffuseColor=Color3.Black();flameMaterial.emissiveColor=color3('#9CBC83').scale(1.2);flameMaterial.disableLighting=true;
  const activeMaterial=new StandardMaterial('awakened-shrine-light',scene);activeMaterial.diffuseColor=Color3.Black();activeMaterial.emissiveColor=color3('#F5CA6A').scale(1.8);activeMaterial.disableLighting=true;
  for(const [i,pos] of [new Vector3(-22,9.7,3.2),new Vector3(17,9.7,-1.7),new Vector3(24,9.7,7.8)].entries()){
    const root=new TransformNode('shrine-'+i,scene);root.position=pos;
    const base=dressedStone(scene,'shrine-plinth',1.35,.35,1.35,stone[2]!);base.position=pos.add(new Vector3(0,.18,0));add(base);
    const body=MeshBuilder.CreateCylinder('altar-bowl-stem',{height:1.05,diameterTop:.8,diameterBottom:.52,tessellation:8},scene);body.position=pos.add(new Vector3(0,.88,0));body.material=stone[0]!;add(body);
    const bowl=MeshBuilder.CreateTorus('brass-bowl-rim',{diameter:1,thickness:.1,tessellation:24},scene);bowl.position=pos.add(new Vector3(0,1.48,0));bowl.material=gold;add(bowl);
    const flame=MeshBuilder.CreateIcoSphere('shrine-spirit-'+i,{radius:.2,subdivisions:1},scene);flame.parent=root;flame.position.y=1.8;flame.scaling.y=1.65;flame.material=flameMaterial;
    const halo=arc(scene,'shrine-orbit-'+i,.39,.018,.025,0,TAU,gold,48);halo.parent=root;halo.position.y=1.8;halo.rotation.x=Math.PI/2;
    const light=new PointLight('altar-lantern-'+i,pos.add(new Vector3(0,1.8,0)),scene);light.diffuse=color3('#EADAA1');light.intensity=.8;light.range=5;
    shrines.push({root,flame,halo,light,active:false,name:['風の祭壇','水の祭壇','光の祭壇'][i]!});
  }
  const avatar=new TransformNode('traveler',scene);avatar.position.set(-23,9.55,-3.6);const cloak=surface(scene,'terracotta-traveler-cloak','#A84935',0,.92),linen=surface(scene,'linen','#E8D2A2',0,.88),boot=surface(scene,'leather','#57422F',0,.91);
  const body=MeshBuilder.CreateCylinder('traveler-cloak',{height:.82,diameterTop:.32,diameterBottom:.6,tessellation:8},scene);body.parent=avatar;body.position.y=.66;body.material=cloak;
  const head=MeshBuilder.CreateSphere('traveler-hood',{diameter:.46,segments:8},scene);head.parent=avatar;head.position.y=1.15;head.material=linen;
  const face=MeshBuilder.CreateSphere('traveler-face',{diameter:.26,segments:6},scene);face.parent=avatar;face.position.set(0,1.12,.19);face.material=boot;
  const pack=MeshBuilder.CreateBox('traveler-satchel',{width:.33,height:.38,depth:.21},scene);pack.parent=avatar;pack.position.set(0,.73,-.25);pack.material=boot;
  const legs:TransformNode[]=[];for(const side of [-1,1]){const limb=new TransformNode('traveler-leg',scene);limb.parent=avatar;limb.position.set(side*.12,.37,0);const m=MeshBuilder.CreateCylinder('traveler-boot',{height:.32,diameter:.16,tessellation:6},scene);m.parent=limb;m.position.y=-.15;m.material=boot;legs.push(limb);}
  const staff=MeshBuilder.CreateCylinder('walking-staff',{height:1.36,diameter:.045,tessellation:5},scene);staff.parent=avatar;staff.position.set(.36,.67,.14);staff.rotation.z=-.1;staff.material=bark;
  const dust=new ParticleSystem('sunlit-pollen',mobile?50:160,scene);dust.particleTexture=softTexture;dust.emitter=new Vector3(0,12,3);dust.minEmitBox=new Vector3(-27,-1,-8);dust.maxEmitBox=new Vector3(28,6,18);dust.minSize=.025;dust.maxSize=.065;dust.minLifeTime=7;dust.maxLifeTime=12;dust.color1=new Color4(1,.88,.53,.5);dust.color2=new Color4(.9,1,.67,.3);dust.colorDead=new Color4(1,1,.7,0);dust.emitRate=mobile?7:15;dust.direction1=new Vector3(.05,.01,.01);dust.direction2=new Vector3(.1,.05,.06);dust.minEmitPower=.3;dust.maxEmitPower=.6;dust.start();particles.push(dust);
  return {shrines,avatar,legs,falls,particles,staticMeshes,foliage,shores,flameMaterial,activeMaterial};
}
