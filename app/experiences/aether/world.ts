import { Engine } from '@babylonjs/core/Engines/engine';
import { Scene } from '@babylonjs/core/scene';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Color3, Color4 } from '@babylonjs/core/Maths/math.color';
import { Plane } from '@babylonjs/core/Maths/math.plane';
import { ArcRotateCamera } from '@babylonjs/core/Cameras/arcRotateCamera';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight';
import { DirectionalLight } from '@babylonjs/core/Lights/directionalLight';
import { PointLight } from '@babylonjs/core/Lights/pointLight';
import { ShadowGenerator } from '@babylonjs/core/Lights/Shadows/shadowGenerator';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { ShaderMaterial } from '@babylonjs/core/Materials/shaderMaterial';
import { ImageProcessingConfiguration } from '@babylonjs/core/Materials/imageProcessingConfiguration';
import { CubeTexture } from '@babylonjs/core/Materials/Textures/cubeTexture';
import { MirrorTexture } from '@babylonjs/core/Materials/Textures/mirrorTexture';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture';
import { ParticleSystem } from '@babylonjs/core/Particles/particleSystem';
import { DefaultRenderingPipeline } from '@babylonjs/core/PostProcesses/RenderPipeline/Pipelines/defaultRenderingPipeline';
import { SceneInstrumentation } from '@babylonjs/core/Instrumentation/sceneInstrumentation';
import { Constants } from '@babylonjs/core/Engines/constants';
import type { Material } from '@babylonjs/core/Materials/material';
import '@babylonjs/core/Lights/Shadows/shadowGeneratorSceneComponent';
import '@babylonjs/core/PostProcesses/RenderPipeline/postProcessRenderPipelineManagerSceneComponent';
import { color3 } from './geometry';
import { buildRuins, type Ruins } from './landscape';
import { skyVertex, skyFragment, waterVertex, waterFragment } from './shaders';
import { SanctuaryAudio } from './audio';
export type Quality='auto'|'ultra'|'balanced'|'low';
export interface WorldState {count:number;nearby:string|null;complete:boolean;quality:string;paused:boolean;}
export interface WorldOptions {onState:(state:WorldState)=>void;onReady:()=>void;onError:(error:unknown)=>void;compatibility?:boolean;}
export class AetherWorld {
  static disposeCanvasEngines(canvas:HTMLCanvasElement){for(const engine of [...Engine.Instances])if(engine.getRenderingCanvas()===canvas)engine.dispose();}
  readonly engine:Engine;
  readonly scene:Scene;
  readonly camera:ArcRotateCamera;
  private audio=new SanctuaryAudio();
  private pipeline:DefaultRenderingPipeline;
  private shadow:ShadowGenerator;
  private mirror:MirrorTexture;
  private sky:ShaderMaterial;
  private water:ShaderMaterial;
  private ruins:Ruins;
  private instrumentation:SceneInstrumentation;
  private mobile=window.matchMedia('(pointer:coarse)').matches||/iPhone|iPad|Android/i.test(navigator.userAgent);
  private level=2;
  private maximumLevel=2;
  private quality:Quality='auto';
  private started=false;
  private paused=false;
  private disposed=false;
  private ready=false;
  private elapsed=0;
  private awakening=0;
  private targetAwakening=0;
  private targetAlpha=-2.22;
  private targetBeta=1.02;
  private targetRadius=62;
  private cameraTarget=new Vector3(0,8.2,5);
  private velocity=new Vector3();
  private moveInput={x:0,y:0};
  private lookPointer:{id:number;x:number;y:number}|null=null;
  private keys=new Set<string>();
  private removers:(()=>void)[]=[];
  private stateKey='';
  private frameSum=0;
  private frameCount=0;
  private lastQualityCheck=0;
  private createdAt=performance.now();
  private reduced=window.matchMedia('(prefers-reduced-motion:reduce)').matches;
  private frame=()=>this.render();
  constructor(private canvas:HTMLCanvasElement,private options:WorldOptions){
    this.engine=new Engine(canvas,!this.mobile&&!options.compatibility,{preserveDrawingBuffer:false,stencil:false,powerPreference:this.mobile?'default':'high-performance',audioEngine:false,disableWebGL2Support:!!options.compatibility},false);
    const caps=this.engine.getCaps(),constrained=options.compatibility||this.engine.webGLVersion<2||!caps.textureHalfFloatRender;
    this.maximumLevel=this.mobile||constrained?1:2;this.level=this.mobile||constrained?0:2;
    this.engine.setHardwareScalingLevel(this.level===0?1.15:1/Math.min(window.devicePixelRatio,1.5));
    const scene=this.scene=new Scene(this.engine);scene.clearColor=new Color4(.61,.81,.84,1);scene.fogMode=Scene.FOGMODE_EXP2;scene.fogDensity=.0028;scene.fogColor=new Color3(.62,.79,.81);
    this.instrumentation=new SceneInstrumentation(scene);this.instrumentation.captureFrameTime=true;
    const env=new CubeTexture('/aether/royal-esplanade.env',scene,{prefiltered:true,onError:()=>{if(!this.disposed){scene.environmentTexture=null;env.dispose();}}});scene.environmentTexture=env;scene.environmentIntensity=.3;
    const image=scene.imageProcessingConfiguration;image.toneMappingEnabled=true;image.toneMappingType=ImageProcessingConfiguration.TONEMAPPING_ACES;image.exposure=1.12;image.contrast=1.06;image.vignetteEnabled=true;image.vignetteWeight=.35;image.vignetteColor=new Color4(.22,.28,.18,1);
    this.camera=new ArcRotateCamera('over-the-canyon',this.targetAlpha,this.targetBeta,this.targetRadius,this.cameraTarget.clone(),scene);this.camera.inputs.clear();this.camera.minZ=.2;this.camera.maxZ=450;this.camera.fov=.58;
    if(this.mobile&&canvas.clientWidth<canvas.clientHeight)this.camera.fov=1.04;
    const hemi=new HemisphericLight('blue-daylight',new Vector3(.1,1,0),scene);hemi.diffuse=color3('#D4E7E6');hemi.groundColor=color3('#657D6C');hemi.intensity=.5;
    const sun=new DirectionalLight('late-afternoon-sun',new Vector3(.65,-1,.5),scene);sun.position.set(-38,65,-32);sun.diffuse=color3('#FFE1AA');sun.intensity=3.8;sun.shadowMinZ=1;sun.shadowMaxZ=160;sun.shadowFrustumSize=95;
    this.shadow=new ShadowGenerator(this.level===2?2048:512,sun);this.shadow.usePercentageCloserFiltering=this.engine.webGLVersion>1;this.shadow.filteringQuality=this.level===2?ShadowGenerator.QUALITY_MEDIUM:ShadowGenerator.QUALITY_LOW;this.shadow.bias=.0008;this.shadow.normalBias=this.level===2?.065:.16;this.shadow.setDarkness(.18);
    this.pipeline=new DefaultRenderingPipeline('sunlit-cinema',!this.mobile&&!constrained,scene,[this.camera]);this.pipeline.samples=this.level===2?Math.min(4,caps.maxMSAASamples||1):1;this.pipeline.fxaaEnabled=true;this.pipeline.bloomEnabled=true;this.pipeline.bloomThreshold=1.15;this.pipeline.bloomWeight=.13;this.pipeline.bloomKernel=this.level===2?64:32;this.pipeline.bloomScale=this.level===2?.5:.25;
    this.pipeline.depthOfFieldEnabled=false;this.pipeline.depthOfField.focusDistance=this.targetRadius*1000;this.pipeline.depthOfField.focalLength=85;this.pipeline.depthOfField.fStop=4;
    this.sky=new ShaderMaterial('summer-sky',scene,{vertexSource:skyVertex,fragmentSource:skyFragment},{attributes:['position'],uniforms:['worldViewProjection','time']});this.sky.backFaceCulling=false;this.sky.disableDepthWrite=true;
    const dome=MeshBuilder.CreateSphere('sky-dome',{diameter:800,segments:16},scene);dome.material=this.sky;dome.infiniteDistance=true;dome.applyFog=false;
    this.ruins=buildRuins(scene,this.mobile);
    // Merge geometry by material and shadow role, within 16-bit index limits.
    const groups=new Map<string,{material:Material;casts:boolean;meshes:Mesh[]}>();
    for(const m of this.ruins.staticMeshes){if(!m.material)continue;const casts=m.metadata?.casts!==false,key=m.material.uniqueId+'-'+casts;const g=groups.get(key)??{material:m.material,casts,meshes:[]};g.meshes.push(m);groups.set(key,g);}
    const merged:Mesh[]=[];this.shadow.getShadowMap()!.renderList=[];
    for(const group of groups.values()){
      let batch:Mesh[]=[],vertices=0;
      const flush=()=>{const m=Mesh.MergeMeshes(batch,true,false,undefined,false,false);if(m){m.name='batched-'+group.material.name;m.material=group.material;m.receiveShadows=true;merged.push(m);if(group.casts)this.shadow.addShadowCaster(m);}batch=[];vertices=0;};
      for(const m of group.meshes){if(vertices+m.getTotalVertices()>60000)flush();batch.push(m);vertices+=m.getTotalVertices();}if(batch.length)flush();
    }
    this.ruins.foliage.forEach(m=>this.shadow.addShadowCaster(m));this.ruins.avatar.getChildMeshes().forEach(m=>this.shadow.addShadowCaster(m));
    const reflectionType=!this.mobile&&!constrained&&caps.textureHalfFloatLinearFiltering?Constants.TEXTURETYPE_HALF_FLOAT:Constants.TEXTURETYPE_UNSIGNED_BYTE;
    this.mirror=new MirrorTexture('turquoise-canyon-reflection',this.level===2?512:256,scene,false,reflectionType);this.mirror.mirrorPlane=new Plane(0,-1,0,.05);this.mirror.renderList=[dome,...merged,...this.ruins.foliage];this.mirror.refreshRate=this.level===2?3:5;
    this.water=new ShaderMaterial('turquoise-river',scene,{vertexSource:waterVertex,fragmentSource:waterFragment},{attributes:['position'],uniforms:['world','worldViewProjection','reflectionMatrix','cameraPosition','time','awakening','shores'],samplers:['reflectionSampler']});this.water.backFaceCulling=false;this.water.setTexture('reflectionSampler',this.mirror);this.water.setArray4('shores',this.ruins.shores);
    const river=MeshBuilder.CreateGround('river-below-the-bridge',{width:350,height:380},scene);river.position.set(0,.05,40);river.material=this.water;
    for(const m of scene.meshes)m.isPickable=false;
    this.listen();this.engine.runRenderLoop(this.frame);
  }
  private on(target:EventTarget,name:string,handler:EventListener){target.addEventListener(name,handler);this.removers.push(()=>target.removeEventListener(name,handler));}
  private clearInput(){this.keys.clear();this.lookPointer=null;this.setMoveInput(0,0);}
  private listen(){
    const resize=()=>{this.engine.resize();this.camera.fov=this.mobile&&this.canvas.clientWidth<this.canvas.clientHeight?1.04:.58;};this.on(window,'resize',resize);if(window.visualViewport)this.on(window.visualViewport,'resize',resize);
    this.on(window,'keydown',((e:KeyboardEvent)=>{if(!this.started)return;if(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code))e.preventDefault();if(e.code==='Escape'){this.paused=!this.paused;this.clearInput();this.notify();}if(this.paused)return;this.keys.add(e.code);if(e.code==='KeyE'&&!e.repeat)this.interact();}) as EventListener);
    this.on(window,'keyup',((e:KeyboardEvent)=>{this.keys.delete(e.code);}) as EventListener);
    this.on(this.canvas,'pointerdown',((e:PointerEvent)=>{if(!this.started||this.paused||this.lookPointer)return;this.lookPointer={id:e.pointerId,x:e.clientX,y:e.clientY};this.canvas.setPointerCapture(e.pointerId);}) as EventListener);
    this.on(window,'pointermove',((e:PointerEvent)=>{if(!this.started||this.paused||e.pointerId!==this.lookPointer?.id)return;const p=this.lookPointer!,dx=e.clientX-p.x,dy=e.clientY-p.y;p.x=e.clientX;p.y=e.clientY;this.targetAlpha=Math.max(-2.8,Math.min(-1.25,this.targetAlpha-dx*.003));this.targetBeta=Math.max(.58,Math.min(1.18,this.targetBeta+dy*.002));}) as EventListener);
    const up=((e:PointerEvent)=>{if(e.pointerId===this.lookPointer?.id)this.lookPointer=null;}) as EventListener;this.on(window,'pointerup',up);this.on(window,'pointercancel',up);
    this.on(this.canvas,'wheel',((e:WheelEvent)=>{if(!this.started||this.paused)return;e.preventDefault();this.targetRadius=Math.max(45,Math.min(82,this.targetRadius+e.deltaY*.025));}) as EventListener);
    this.on(window,'blur',()=>this.clearInput());this.on(document,'visibilitychange',()=>{this.clearInput();if(document.hidden){this.engine.stopRenderLoop(this.frame);this.audio.suspend();}else if(!this.disposed){this.engine.runRenderLoop(this.frame);if(this.started&&!this.paused)this.audio.resume();}});
    this.on(this.canvas,'webglcontextlost',((e:Event)=>{e.preventDefault();this.clearInput();this.paused=true;this.engine.stopRenderLoop(this.frame);this.options.onError(new Error('Graphics context lost'));}) as EventListener);
  }
  start(){this.started=true;this.pipeline.depthOfField.fStop=8;void this.audio.start().catch(()=>{});this.canvas.focus({preventScroll:true});this.notify();}
  setMoveInput(x:number,forward:number){this.moveInput={x:Math.max(-1,Math.min(1,x)),y:Math.max(-1,Math.min(1,forward))};}
  setMuted(muted:boolean){this.audio.setMuted(muted);}
  pause(){this.paused=true;this.clearInput();this.notify();}
  resume(){this.paused=false;this.clearInput();this.audio.resume();this.notify();}
  reset(){this.clearInput();this.ruins.avatar.position.set(-23,9.55,-3.6);this.ruins.avatar.rotation.y=0;this.velocity.setAll(0);this.ruins.shrines.forEach(b=>{b.active=false;b.flame.material=this.ruins.flameMaterial;b.light.intensity=.8;});this.targetAwakening=0;this.paused=false;this.targetAlpha=-2.22;this.targetBeta=1.02;this.targetRadius=62;this.notify();}
  setQuality(quality:Quality){this.quality=quality;this.applyQuality(quality==='low'?0:quality==='balanced'?1:2);}
  private applyQuality(level:number){this.level=level=Math.min(level,this.maximumLevel);const ratio=Math.min(window.devicePixelRatio,level===2?1.5:1);this.engine.setHardwareScalingLevel((level===0?1.15:1)/ratio);this.pipeline.samples=level===2?Math.min(4,this.engine.getCaps().maxMSAASamples||1):1;this.pipeline.depthOfFieldEnabled=false;this.shadow.getShadowMap()?.resize(level===2?2048:level===1?1024:512);this.shadow.filteringQuality=level===2?ShadowGenerator.QUALITY_MEDIUM:ShadowGenerator.QUALITY_LOW;this.shadow.normalBias=level===2?.065:level===1?.1:.16;this.mirror.resize(level===2?512:256);this.mirror.refreshRate=level===0?5:3;this.notify();}
  private walkable(x:number,z:number){return (x>=-27&&x<=-14.4&&z>=-5.9&&z<=5.9)||(x>=-14.5&&x<=14.5&&Math.abs(z)<=1.64)||(x>=14.4&&x<=27.5&&z>=-5.1&&z<=11.2);}
  private nearby(){return this.ruins.shrines.find(b=>!b.active&&Vector3.Distance(this.ruins.avatar.position,b.root.position)<2.65);}
  interact(){if(!this.started||this.paused)return;const shrine=this.nearby();if(!shrine)return;shrine.active=true;shrine.flame.material=this.ruins.activeMaterial;shrine.light.intensity=3;const count=this.ruins.shrines.filter(b=>b.active).length;this.targetAwakening=count/3;this.audio.chime(count===3);this.notify();}
  private notify(){const count=this.ruins.shrines.filter(b=>b.active).length;const state:WorldState={count,nearby:this.started?this.nearby()?.name??null:null,complete:count===3,quality:['低負荷','標準','最高'][this.level]!,paused:this.paused};const key=JSON.stringify(state);if(key!==this.stateKey){this.stateKey=key;this.options.onState(state);}}
  private render(){if(this.disposed)return;try{this.renderFrame();if(!this.ready&&this.scene.isReady()){this.ready=true;this.options.onReady();this.notify();}}catch(e){this.engine.stopRenderLoop(this.frame);this.options.onError(e);}}
  private renderFrame(){
    const dt=Math.min(this.engine.getDeltaTime()/1000,.1),ease=1-Math.exp(-dt*9);
    if(!this.paused){
      this.elapsed+=dt;const t=this.elapsed;this.awakening+=(this.targetAwakening-this.awakening)*dt*.4;
      this.camera.alpha+=(this.targetAlpha-this.camera.alpha)*ease;this.camera.beta+=(this.targetBeta-this.camera.beta)*ease;const portraitScale=this.mobile&&this.canvas.clientWidth<this.canvas.clientHeight?1.35:1;this.camera.radius+=(this.targetRadius*portraitScale-this.camera.radius)*ease;
      const avatar=this.ruins.avatar;
      if(this.started){
        let f=Number(this.keys.has('KeyW'))-Number(this.keys.has('KeyS'))+this.moveInput.y,s=Number(this.keys.has('KeyD'))-Number(this.keys.has('KeyA'))+this.moveInput.x;const n=Math.max(1,Math.hypot(f,s));f/=n;s/=n;
        if(this.keys.has('ArrowLeft'))this.targetAlpha-=dt*.5;if(this.keys.has('ArrowRight'))this.targetAlpha+=dt*.5;if(this.keys.has('ArrowUp'))this.targetBeta-=dt*.3;if(this.keys.has('ArrowDown'))this.targetBeta+=dt*.3;this.targetAlpha=Math.max(-2.8,Math.min(-1.25,this.targetAlpha));this.targetBeta=Math.max(.58,Math.min(1.18,this.targetBeta));
        const a=this.camera.alpha,speed=this.keys.has('ShiftLeft')?5.5:3.3,vx=(-Math.sin(a)*s-Math.cos(a)*f)*speed,vz=(Math.cos(a)*s-Math.sin(a)*f)*speed;
        this.velocity.x+=(vx-this.velocity.x)*ease;this.velocity.z+=(vz-this.velocity.z)*ease;const p=avatar.position,x=p.x+this.velocity.x*dt,z=p.z+this.velocity.z*dt;if(this.walkable(x,p.z))p.x=x;if(this.walkable(p.x,z))p.z=z;
        const motion=Math.min(1,this.velocity.length()/3);if(motion>.05)avatar.rotation.y=Math.atan2(this.velocity.x,this.velocity.z);avatar.position.y=9.55+(this.reduced?0:Math.sin(t*10)*.018*motion);this.ruins.legs.forEach((leg,i)=>leg.rotation.x=Math.sin(t*10+i*Math.PI)*.4*motion);
        this.cameraTarget.set(avatar.position.x*.32,8.5,4+avatar.position.z*.24);
      }else this.cameraTarget.set(0,8.2+(this.reduced?0:Math.sin(t*.08)*.12),5);
      Vector3.LerpToRef(this.camera.target,this.cameraTarget,1-Math.exp(-dt*1.5),this.camera.target);this.pipeline.depthOfField.focusDistance=this.camera.radius*1000;
      this.sky.setFloat('time',t);this.water.setFloat('time',t);this.water.setFloat('awakening',this.awakening);this.water.setVector3('cameraPosition',this.camera.position);this.water.setMatrix('reflectionMatrix',this.scene.getTransformMatrix());this.ruins.falls.forEach(m=>m.setFloat('time',t));
      this.ruins.shrines.forEach((b,i)=>{b.flame.position.y=1.8+(this.reduced?0:Math.sin(t*1.8+i)*.07);b.flame.rotation.y=t*.3;b.halo.rotation.y=t*.17;b.flame.scaling.y=1.55+Math.sin(t*2+i)*.1;});
      this.scene.imageProcessingConfiguration.exposure=1.12+this.awakening*.06;this.notify();
      const wall=(performance.now()-this.createdAt)/1000;
      if(this.ready&&wall>8&&this.quality==='auto'){this.frameSum+=this.engine.getDeltaTime();this.frameCount++;if(wall-this.lastQualityCheck>6&&this.frameCount>15){const average=this.frameSum/this.frameCount;this.pipeline.depthOfFieldEnabled=this.level===2&&average<23;if(average>27&&this.level>0)this.applyQuality(this.level-1);else if(average<17&&this.level<this.maximumLevel)this.applyQuality(this.level+1);this.frameSum=0;this.frameCount=0;this.lastQualityCheck=wall;}}
    }
    this.scene.render();
  }
  diagnostics(){return {fps:Math.round(this.engine.getFps()),meshes:this.scene.meshes.length,drawCalls:this.engine._drawCalls.current,position:this.ruins.avatar.position.asArray(),cameraPosition:this.camera.position.asArray(),alpha:this.camera.alpha,beta:this.camera.beta,quality:this.level,mobile:this.mobile,webGL:this.engine.webGLVersion,reflectionType:this.mirror.textureType,samples:this.pipeline.samples,ready:this.scene.isReady(),beacons:this.ruins.shrines.map(s=>s.active)};}
  dispose(){this.disposed=true;this.engine.stopRenderLoop(this.frame);this.removers.forEach(r=>r());this.keys.clear();this.audio.dispose();this.instrumentation.dispose();this.scene.dispose();this.engine.dispose();}
}
