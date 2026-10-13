import { Engine } from '@babylonjs/core/Engines/engine';
import { Scene } from '@babylonjs/core/scene';
import { FreeCamera } from '@babylonjs/core/Cameras/freeCamera';
import { Vector3,Matrix,Quaternion } from '@babylonjs/core/Maths/math.vector';
import { Color3,Color4 } from '@babylonjs/core/Maths/math.color';
import { DirectionalLight } from '@babylonjs/core/Lights/directionalLight';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight';
import { PointLight } from '@babylonjs/core/Lights/pointLight';
import { ShadowGenerator } from '@babylonjs/core/Lights/Shadows/shadowGenerator';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import { PBRMaterial } from '@babylonjs/core/Materials/PBR/pbrMaterial';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { ImageProcessingConfiguration } from '@babylonjs/core/Materials/imageProcessingConfiguration';
import { Texture } from '@babylonjs/core/Materials/Textures/texture';
import { RawTexture } from '@babylonjs/core/Materials/Textures/rawTexture';
import { HDRCubeTexture } from '@babylonjs/core/Materials/Textures/hdrCubeTexture';
import { DefaultRenderingPipeline } from '@babylonjs/core/PostProcesses/RenderPipeline/Pipelines/defaultRenderingPipeline';
import { SSAO2RenderingPipeline } from '@babylonjs/core/PostProcesses/RenderPipeline/Pipelines/ssao2RenderingPipeline';
import { SceneLoader } from '@babylonjs/core/Loading/sceneLoader';
import { SceneInstrumentation } from '@babylonjs/core/Instrumentation/sceneInstrumentation';
import '@babylonjs/core/Rendering/depthRendererSceneComponent';
import '@babylonjs/core/Rendering/geometryBufferRendererSceneComponent';
import '@babylonjs/core/Rendering/prePassRendererSceneComponent';
import '@babylonjs/core/Lights/Shadows/shadowGeneratorSceneComponent';
import '@babylonjs/core/Meshes/thinInstanceMesh';
import '@babylonjs/core/Culling/ray';
import '@babylonjs/loaders/glTF';
import { ASSET_URL,ENVIRONMENT_URL,CAMERA_FOV,QUALITY,projectionFov } from '../shared/types';
import type { Adapter,Settings,CameraState,WorldState,Vec3 } from '../shared/types';
import { cameraPosition } from '../shared/camera';
import { motions,ripples,fountainDrops,RIPPLE_COUNT,JET_COUNT } from '../shared/animation';
import { rippleGeometry,dropGeometry,waterNormal } from '../shared/effects';
import { LIGHTS } from '../shared/scene';

export class BabylonAdapter implements Adapter {
  engine='babylon' as const;
  version=Engine.Version;
  private renderer!:Engine;
  private scene!:Scene;
  private camera!:FreeCamera;
  private sun!:DirectionalLight;
  private hemisphere!:HemisphericLight;
  private shadow!:ShadowGenerator;
  private instrumentation!:SceneInstrumentation;
  private nodes=new Map<string,TransformNode>();
  private settings!:Settings;
  private lamps:PointLight[]=[];
  private waterTexture!:RawTexture;
  private pipeline:DefaultRenderingPipeline|null=null;
  private ao:SSAO2RenderingPipeline|null=null;
  private rippleMesh!:Mesh;
  private dropMesh!:Mesh;
  private rippleMatrices=new Float32Array(RIPPLE_COUNT*16);
  private dropMatrices=new Float32Array(JET_COUNT*8*16);
  private width=1;
  private height=1;
  private pixelRatio=1;
  private matrix=Matrix.Identity();
  private canvas!:HTMLCanvasElement;

  async initialize(canvas:HTMLCanvasElement,settings:Settings,progress:(label:string)=>void){
    this.canvas=canvas;
    const gl=canvas.getContext('webgl2',{antialias:true,alpha:false,preserveDrawingBuffer:true,powerPreference:'high-performance'});
    if(!gl)throw new Error('このブラウザでは WebGL 2 を利用できません。');
    this.renderer=new Engine(gl,true,{preserveDrawingBuffer:true,stencil:true,disableWebGL2Support:false},false);
    this.scene=new Scene(this.renderer);this.scene.useRightHandedSystem=true;
    this.camera=new FreeCamera('shared-camera',new Vector3(25,26,30),this.scene);
    this.camera.fov=CAMERA_FOV;this.camera.minZ=.1;this.camera.maxZ=160;
    this.scene.activeCamera=this.camera;
    this.sun=new DirectionalLight('sun',new Vector3(12,-28,-16).normalize(),this.scene);this.sun.position.set(-12,28,16);
    this.sun.shadowFrustumSize=42;this.sun.shadowMinZ=1;this.sun.shadowMaxZ=75;
    this.hemisphere=new HemisphericLight('sky',Vector3.Up(),this.scene);
    this.shadow=new ShadowGenerator(QUALITY[settings.quality].shadow,this.sun);
    this.shadow.usePercentageCloserFiltering=true;this.shadow.filteringQuality=ShadowGenerator.QUALITY_MEDIUM;
    this.shadow.bias=.00015;this.shadow.normalBias=.025;
    this.instrumentation=new SceneInstrumentation(this.scene);
    for(const [x,z] of LIGHTS){const lamp=new PointLight('lantern',new Vector3(x!,2.18,z!),this.scene);lamp.diffuse=Color3.FromHexString('#ffbb71');lamp.range=5;lamp.intensity=0;this.lamps.push(lamp);}
    progress('共通GLBと環境光を読み込んでいます');
    const envReady=new Promise<void>((resolve,reject)=>{
      const env=new HDRCubeTexture(ENVIRONMENT_URL,this.scene,128,false,true,false,true,resolve,()=>reject(new Error('環境光 HDR の読み込みに失敗しました。')));
      this.scene.environmentTexture=env;
      if(env.isReady())resolve();
    });
    const result=await SceneLoader.ImportMeshAsync('', '',ASSET_URL,this.scene);
    await envReady;
    for(const node of [...result.transformNodes,...result.meshes]){
      this.nodes.set(node.name,node);
      if(node instanceof Mesh && node.getTotalVertices()){
        node.receiveShadows=true;
        if(!node.name.includes('water'))this.shadow.addShadowCaster(node,false);
      }
    }
    const ground=MeshBuilder.CreateGround('studio_floor',{width:200,height:200},this.scene);
    ground.position.y=-1.83;ground.receiveShadows=true;
    const floor=new PBRMaterial('floor',this.scene);floor.albedoColor=Color3.FromHexString('#dad8c5');floor.roughness=1;floor.metallic=0;ground.material=floor;
    this.waterTexture=RawTexture.CreateRGBATexture(waterNormal(),128,128,this.scene,true,false,Texture.TRILINEAR_SAMPLINGMODE);
    this.waterTexture.wrapU=this.waterTexture.wrapV=Texture.WRAP_ADDRESSMODE;this.waterTexture.level=.13;
    for(const mat of this.scene.materials)if(mat instanceof PBRMaterial){
      mat.maxSimultaneousLights=8;
      if(['water','water_deep','fountain_water'].includes(mat.name)){mat.bumpTexture=this.waterTexture;mat.environmentIntensity=.65;}
    }
    this.rippleMesh=this.effect('river-ripples',rippleGeometry(),this.rippleMatrices);
    const rippleMat=new StandardMaterial('ripple',this.scene);rippleMat.diffuseColor=Color3.FromHexString('#b4d6cc');rippleMat.emissiveColor=rippleMat.diffuseColor;rippleMat.disableLighting=true;rippleMat.alpha=.24;rippleMat.backFaceCulling=false;this.rippleMesh.material=rippleMat;
    this.dropMesh=this.effect('fountain-drops',dropGeometry(),this.dropMatrices);
    const dropMat=new PBRMaterial('drops',this.scene);dropMat.albedoColor=Color3.FromHexString('#b0e6dc');dropMat.roughness=.24;dropMat.metallic=.1;dropMat.emissiveColor=Color3.FromHexString('#365f63').scale(.2);this.dropMesh.material=dropMat;
    this.configure(settings);progress('影とマテリアルを準備しています');
    await this.scene.whenReadyAsync();
  }
  private effect(name:string,data:ReturnType<typeof rippleGeometry>,matrices:Float32Array):Mesh{
    const mesh=new Mesh(name,this.scene);const vd=new VertexData();Object.assign(vd,data);vd.applyToMesh(mesh);
    mesh.thinInstanceSetBuffer('matrix',matrices,16,false);mesh.alwaysSelectAsActiveMesh=true;mesh.isPickable=false;return mesh;
  }
  resize(width:number,height:number,dpr:number){
    this.width=width;this.height=height;this.pixelRatio=dpr;
    this.camera.fov=projectionFov(width/height);
    this.renderer.setHardwareScalingLevel(1/dpr);this.renderer.setSize(Math.round(width*dpr),Math.round(height*dpr),true);
  }
  configure(settings:Settings){
    const previous=this.settings;this.settings={...settings};
    const q=QUALITY[settings.quality];
    if(this.shadow.mapSize!==q.shadow)this.shadow.mapSize=q.shadow;
    const night=settings.night;
    this.scene.clearColor=Color4.FromHexString(night?'#17262fff':'#ece9ddff');
    this.scene.fogMode=Scene.FOGMODE_EXP2;this.scene.fogColor=Color3.FromHexString(night?'#17262f':'#ece9dd');this.scene.fogDensity=night?.012:.007;
    this.sun.diffuse=Color3.FromHexString(night?'#a5c7e8':'#ffe1b2');this.sun.intensity=night?.60:3.2;
    this.hemisphere.diffuse=Color3.FromHexString(night?'#839cb4':'#c9e0de');this.hemisphere.groundColor=Color3.FromHexString(night?'#454d55':'#aaa080');this.hemisphere.intensity=night?.65:1.4;
    this.scene.environmentIntensity=night?.3:.9;
    const ip=this.scene.imageProcessingConfiguration;ip.toneMappingEnabled=true;ip.toneMappingType=ImageProcessingConfiguration.TONEMAPPING_ACES;ip.exposure=night?1.05:1.15;ip.contrast=1;
    for(const mat of this.scene.materials)if(mat instanceof PBRMaterial && ['window_glow','lamp_glow'].includes(mat.name))mat.emissiveColor=mat.albedoColor.scale(night?(mat.name==='lamp_glow'?4:2.2):.03);
    this.lamps.forEach(l=>l.intensity=night?6:0);
    if(!previous || previous.quality!==settings.quality || previous.comparison!==settings.comparison)this.rebuildPost();
  }
  private rebuildPost(){
    this.ao?.dispose(true);this.ao=null;this.pipeline?.dispose();this.pipeline=null;
    this.scene.imageProcessingConfiguration.applyByPostProcess=false;
    if(this.settings.comparison==='fair')return;
    if(QUALITY[this.settings.quality].ao){
      this.ao=new SSAO2RenderingPipeline('roman-ao',this.scene,{ssaoRatio:.5,blurRatio:1},[this.camera]);
      this.ao.radius=.65;this.ao.totalStrength=.65;this.ao.samples=12;this.ao.expensiveBlur=true;
    }
    this.pipeline=new DefaultRenderingPipeline('roman-finish',true,this.scene,[this.camera]);
    this.pipeline.samples=4;this.pipeline.fxaaEnabled=true;this.pipeline.bloomEnabled=true;
    this.pipeline.bloomThreshold=1.05;this.pipeline.bloomWeight=QUALITY[this.settings.quality].bloom;this.pipeline.bloomKernel=48;this.pipeline.bloomScale=.5;
  }
  render(c:CameraState,world:WorldState,_dt:number){
    const p=cameraPosition(c);this.camera.position.set(p.x,p.y,p.z);this.camera.setTarget(new Vector3(c.target.x,c.target.y,c.target.z));
    for(const motion of motions(world)){
      const node=this.nodes.get(motion.node);if(!node)continue;
      if(motion.position)node.position.set(motion.position.x,motion.position.y,motion.position.z);
      if(motion.rotation){node.rotationQuaternion=null;node.rotation.set(motion.rotation.x,motion.rotation.y,motion.rotation.z);}
      if(motion.visible!==undefined)node.setEnabled(motion.visible);
    }
    this.waterTexture.uOffset=world.time*.022;this.waterTexture.vOffset=world.time*.013;
    ripples(world.time).forEach((p,i)=>{
      Matrix.ComposeToRef(new Vector3(p.scale*1.7,1,p.scale*.33),Quaternion.Identity(),new Vector3(p.x,p.y,p.z),this.matrix);this.matrix.copyToArray(this.rippleMatrices,i*16);
    });this.rippleMesh.thinInstanceBufferUpdated('matrix');
    this.dropMesh.setEnabled(world.fountain);
    if(world.fountain){fountainDrops(world.time).forEach((p,i)=>{Matrix.TranslationToRef(p.x,p.y,p.z,this.matrix);this.matrix.copyToArray(this.dropMatrices,i*16);});this.dropMesh.thinInstanceBufferUpdated('matrix');}
    this.scene.render();
  }
  pick(x:number,y:number){
    const hit=this.scene.pick(x,y,mesh=>mesh.isEnabled() && mesh.isPickable && mesh.name!=='studio_floor' && mesh.getTotalVertices()>0,false,this.camera);
    return hit?.hit && hit.pickedPoint?{point:{x:hit.pickedPoint.x,y:hit.pickedPoint.y,z:hit.pickedPoint.z}}:null;
  }
  project(p:Vec3){
    const v=Vector3.Project(new Vector3(p.x,p.y,p.z),Matrix.Identity(),this.scene.getTransformMatrix(),this.camera.viewport.toGlobal(this.width,this.height));
    return {x:v.x,y:v.y,visible:v.z>0 && v.z<1 && v.x>=0 && v.x<=this.width && v.y>=0 && v.y<=this.height};
  }
  stats(){return {drawCalls:this.instrumentation.drawCallsCounter.current,triangles:Math.round(this.scene.getActiveIndices()/3),textures:this.renderer.getLoadedTexturesCache().length,api:'SceneInstrumentation（全 draw calls）。triangles は主カメラ activeIndices / 3、textures は InternalTexture キャッシュ'};}
  capture(){return this.canvas.toDataURL('image/png');}
  dispose(){this.ao?.dispose(true);this.pipeline?.dispose();this.instrumentation?.dispose();this.scene?.dispose();this.renderer?.dispose();this.nodes.clear();}
}
