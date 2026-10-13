import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { SSAOPass } from 'three/examples/jsm/postprocessing/SSAOPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { ASSET_URL,ENVIRONMENT_URL,CAMERA_FOV,QUALITY,projectionFov } from '../shared/types';
import type { Adapter, Settings, CameraState, WorldState, Vec3 } from '../shared/types';
import { cameraPosition } from '../shared/camera';
import { motions,ripples,fountainDrops,RIPPLE_COUNT,JET_COUNT } from '../shared/animation';
import { rippleGeometry,dropGeometry,waterNormal } from '../shared/effects';
import { LIGHTS } from '../shared/scene';

function effectGeometry(data:ReturnType<typeof rippleGeometry>):THREE.BufferGeometry{
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(data.positions,3));
  g.setAttribute('normal',new THREE.Float32BufferAttribute(data.normals,3));g.setIndex(data.indices);return g;
}
export class ThreeAdapter implements Adapter {
  engine='three' as const;
  version=THREE.REVISION;
  private renderer!:THREE.WebGLRenderer;
  private scene=new THREE.Scene();
  private camera=new THREE.PerspectiveCamera(CAMERA_FOV*180/Math.PI,1,.1,160);
  private sun=new THREE.DirectionalLight(0xffe1b2,3.2);
  private hemisphere=new THREE.HemisphereLight(0xc9e0de,0xaaa080,1.4);
  private nodes=new Map<string,THREE.Object3D>();
  private materials=new Map<string,THREE.MeshStandardMaterial>();
  private lamps:THREE.PointLight[]=[];
  private rippleMesh!:THREE.InstancedMesh;
  private dropMesh!:THREE.InstancedMesh;
  private waterTexture!:THREE.DataTexture;
  private composer:EffectComposer|null=null;
  private ao:SSAOPass|null=null;
  private settings!:Settings;
  private ray=new THREE.Raycaster();
  private matrix=new THREE.Matrix4();
  private width=1;
  private height=1;
  private pixelRatio=1;
  private environment:THREE.WebGLRenderTarget|null=null;

  async initialize(canvas:HTMLCanvasElement,settings:Settings,progress:(label:string)=>void){
    const gl=canvas.getContext('webgl2',{antialias:true,alpha:false,preserveDrawingBuffer:true,powerPreference:'high-performance'});
    if(!gl)throw new Error('このブラウザでは WebGL 2 を利用できません。');
    this.renderer=new THREE.WebGLRenderer({canvas,context:gl,antialias:true,alpha:false,preserveDrawingBuffer:true});
    this.renderer.info.autoReset=false;
    this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.outputColorSpace=THREE.SRGBColorSpace;
    this.sun.position.set(-12,28,16);this.sun.castShadow=true;
    Object.assign(this.sun.shadow.camera,{left:-21,right:21,top:20,bottom:-20,near:1,far:75});
    this.sun.shadow.bias=-.00015;this.sun.shadow.normalBias=.025;
    this.scene.add(this.sun,this.hemisphere);
    for(const [x,z] of LIGHTS){const lamp=new THREE.PointLight(0xffbb71,0,5,2);lamp.position.set(x!,2.18,z!);this.scene.add(lamp);this.lamps.push(lamp);}
    progress('共通GLBと環境光を読み込んでいます');
    const [gltf,hdr]=await Promise.all([new GLTFLoader().loadAsync(ASSET_URL),new RGBELoader().loadAsync(ENVIRONMENT_URL)]);
    const pmrem=new THREE.PMREMGenerator(this.renderer);
    this.environment=pmrem.fromEquirectangular(hdr);this.scene.environment=this.environment.texture;hdr.dispose();pmrem.dispose();
    gltf.scene.traverse(node=>{
      this.nodes.set(node.name,node);
      if(node instanceof THREE.Mesh){
        node.castShadow=!node.name.includes('water');node.receiveShadow=true;
        const mats=Array.isArray(node.material)?node.material:[node.material];
        for(const mat of mats)if(mat instanceof THREE.MeshStandardMaterial)this.materials.set(mat.name,mat);
      }
    });
    this.scene.add(gltf.scene);
    const ground=new THREE.Mesh(new THREE.PlaneGeometry(200,200),new THREE.MeshStandardMaterial({color:0xdad8c5,roughness:1}));
    ground.rotation.x=-Math.PI/2;ground.position.y=-1.83;ground.receiveShadow=true;ground.name='studio_floor';this.scene.add(ground);
    this.waterTexture=new THREE.DataTexture(waterNormal(),128,128,THREE.RGBAFormat);
    this.waterTexture.wrapS=this.waterTexture.wrapT=THREE.RepeatWrapping;this.waterTexture.needsUpdate=true;
    for(const name of ['water','water_deep','fountain_water']){
      const mat=this.materials.get(name);if(mat){mat.normalMap=this.waterTexture;mat.normalScale.set(.13,.13);mat.envMapIntensity=.65;}
    }
    this.rippleMesh=new THREE.InstancedMesh(effectGeometry(rippleGeometry()),new THREE.MeshBasicMaterial({color:0xb4d6cc,transparent:true,opacity:.24,depthWrite:false,side:THREE.DoubleSide}),RIPPLE_COUNT);
    this.rippleMesh.frustumCulled=false;this.scene.add(this.rippleMesh);
    this.dropMesh=new THREE.InstancedMesh(effectGeometry(dropGeometry()),new THREE.MeshStandardMaterial({color:0xb0e6dc,roughness:.24,metalness:.1,emissive:0x365f63,emissiveIntensity:.2}),JET_COUNT*8);
    this.dropMesh.frustumCulled=false;this.scene.add(this.dropMesh);
    this.configure(settings);
    progress('影とマテリアルを準備しています');
    await this.renderer.compileAsync(this.scene,this.camera);
  }
  resize(width:number,height:number,dpr:number){
    this.width=width;this.height=height;this.pixelRatio=dpr;
    this.renderer.setPixelRatio(dpr);this.renderer.setSize(width,height,false);
    this.camera.aspect=width/height;this.camera.fov=projectionFov(width/height)*180/Math.PI;this.camera.updateProjectionMatrix();
    this.composer?.setPixelRatio(dpr);this.composer?.setSize(width,height);
  }
  configure(settings:Settings){
    const previous=this.settings;this.settings={...settings};
    const q=QUALITY[settings.quality];
    if(this.sun.shadow.mapSize.x!==q.shadow){this.sun.shadow.mapSize.set(q.shadow,q.shadow);this.sun.shadow.map?.dispose();this.sun.shadow.map=null;this.sun.shadow.needsUpdate=true;}
    const night=settings.night;
    this.scene.background=new THREE.Color(night?0x17262f:0xece9dd);
    this.scene.fog=new THREE.FogExp2(night?0x17262f:0xece9dd,night?.012:.007);
    this.sun.color.set(night?0xa5c7e8:0xffe1b2);this.sun.intensity=night?.60:3.2;
    this.hemisphere.color.set(night?0x839cb4:0xc9e0de);this.hemisphere.groundColor.set(night?0x454d55:0xaaa080);this.hemisphere.intensity=night?.65:1.4;
    this.scene.environmentIntensity=night?.3:.9;this.renderer.toneMappingExposure=night?1.05:1.15;
    for(const mat of this.materials.values())if(mat.name==='lamp_glow' || mat.name==='window_glow'){
      mat.emissive.copy(mat.color);mat.emissiveIntensity=night?(mat.name==='lamp_glow'?4:2.2):.03;
    }
    this.lamps.forEach(l=>l.intensity=night?6:0);
    if(!previous || previous.quality!==settings.quality || previous.comparison!==settings.comparison)this.rebuildPost();
  }
  private rebuildPost(){
    this.disposePost();
    if(this.settings.comparison==='fair')return;
    this.composer=new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene,this.camera));
    if(QUALITY[this.settings.quality].ao){
      this.ao=new SSAOPass(this.scene,this.camera,this.width,this.height);
      this.ao.kernelRadius=.65;this.ao.minDistance=.0005;this.ao.maxDistance=.012;
      this.composer.addPass(this.ao);
    }
    this.composer.addPass(new UnrealBloomPass(new THREE.Vector2(this.width,this.height),QUALITY[this.settings.quality].bloom,.6,1.05));
    this.composer.addPass(new OutputPass());
    this.composer.setPixelRatio(this.pixelRatio);this.composer.setSize(this.width,this.height);
  }
  render(c:CameraState,world:WorldState,dt:number){
    const pos=cameraPosition(c);this.camera.position.set(pos.x,pos.y,pos.z);this.camera.lookAt(c.target.x,c.target.y,c.target.z);this.camera.updateMatrixWorld();
    for(const motion of motions(world)){
      const node=this.nodes.get(motion.node);if(!node)continue;
      if(motion.position)node.position.set(motion.position.x,motion.position.y,motion.position.z);
      if(motion.rotation){node.quaternion.identity();node.rotation.set(motion.rotation.x,motion.rotation.y,motion.rotation.z);}
      if(motion.visible!==undefined)node.visible=motion.visible;
    }
    this.waterTexture.offset.set(world.time*.022,world.time*.013);
    ripples(world.time).forEach((p,i)=>{
      this.matrix.makeScale(p.scale*1.7,1,p.scale*.33);this.matrix.setPosition(p.x,p.y,p.z);this.rippleMesh.setMatrixAt(i,this.matrix);
    });this.rippleMesh.instanceMatrix.needsUpdate=true;
    this.dropMesh.visible=world.fountain;
    if(world.fountain){fountainDrops(world.time).forEach((p,i)=>{this.matrix.makeTranslation(p.x,p.y,p.z);this.dropMesh.setMatrixAt(i,this.matrix);});this.dropMesh.instanceMatrix.needsUpdate=true;}
    this.renderer.info.reset();
    if(this.composer)this.composer.render(dt);else this.renderer.render(this.scene,this.camera);
  }
  pick(x:number,y:number){
    this.ray.setFromCamera(new THREE.Vector2(x/this.width*2-1,1-y/this.height*2),this.camera);
    const hit=this.ray.intersectObjects(this.scene.children,true).find(h=>h.object.name!=='studio_floor' && h.object!==this.rippleMesh && h.object!==this.dropMesh);
    return hit?{point:{x:hit.point.x,y:hit.point.y,z:hit.point.z}}:null;
  }
  project(p:Vec3){const v=new THREE.Vector3(p.x,p.y,p.z).project(this.camera);return {x:(v.x+1)*this.width/2,y:(1-v.y)*this.height/2,visible:v.z<1 && v.z>-1 && Math.abs(v.x)<1 && Math.abs(v.y)<1};}
  stats(){return {drawCalls:this.renderer.info.render.calls,triangles:this.renderer.info.render.triangles,textures:this.renderer.info.memory.textures,api:'renderer.info（影・ポスト処理を含む。textures は割当済み GPU テクスチャ）'};}
  capture(){return this.renderer.domElement.toDataURL('image/png');}
  private disposePost(){
    if(this.composer){for(const pass of this.composer.passes)pass.dispose?.();this.composer.dispose();this.composer=null;}this.ao=null;
  }
  dispose(){
    this.disposePost();this.scene.traverse(node=>{if(node instanceof THREE.Mesh)node.geometry.dispose();});
    const textures=new Set<THREE.Texture>();
    this.scene.traverse(node=>{if(node instanceof THREE.Mesh){for(const mat of Array.isArray(node.material)?node.material:[node.material]){
      for(const value of Object.values(mat))if(value instanceof THREE.Texture)textures.add(value);mat.dispose();
    }}});
    textures.forEach(t=>t.dispose());this.environment?.dispose();this.sun.shadow.dispose();this.renderer?.dispose();this.renderer?.forceContextLoss();this.scene.clear();this.nodes.clear();this.materials.clear();
  }
}
