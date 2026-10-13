import { SharedCamera,cloneCamera } from './camera';
import { RomanGame } from './game';
import { SharedInput } from './input';
import { LANDMARKS,landmarkAt,nearestLandmark } from './scene';
import { QUALITY } from './types';
import type { Adapter,EngineId,FrameMetrics,Landmark,Settings,GameMode } from './types';
import { createPuzzle,rotatePipe,waterNetwork } from './puzzle';
import type { Pipe } from './puzzle';
import { loadSession,saveSession,saveRecord,saveShot,download,defaultSettings } from '../comparison/storage';
import type { Measurement,Session } from '../comparison/storage';
export interface LabStatus {
  ready:boolean;selected:Landmark|null;nearby:Landmark|null;discoveries:string[];mode:GameMode;
  settings:Settings;puzzle:Pipe[];wet:number[];solved:boolean;puzzleOpen:boolean;
  paused:boolean;notice:string;metrics:FrameMetrics|null;benchmark:number|null;
  hotspots:{id:string;x:number;y:number;visible:boolean}[];
}
export class LabRuntime {
  camera=new SharedCamera();
  game=new RomanGame();
  input!:SharedInput;
  status:LabStatus;
  private adapter!:Adapter;
  private canvas:HTMLCanvasElement;
  private callback:(status:LabStatus)=>void;
  private abort=new AbortController();
  private observer:ResizeObserver|null=null;
  private raf=0;
  private disposed=false;
  private previous=0;
  private metricStart=0;
  private metricFrames=0;
  private lastUi=0;
  private loadMs=0;
  private width=1;
  private height=1;
  private ratio=1;
  private benchmarkStart:number|null=null;
  private sampleStart:number|null=null;
  private sampleFrames=0;
  private drawSum=0;
  private triSum=0;
  private sampleStats=0;
  private noticeUntil=0;
  private context='';
  constructor(canvas:HTMLCanvasElement,callback:(s:LabStatus)=>void){
    this.canvas=canvas;this.callback=callback;
    this.status={ready:false,selected:null,nearby:null,discoveries:[],mode:'diorama',settings:defaultSettings(),puzzle:createPuzzle(),wet:[],solved:false,puzzleOpen:false,paused:false,notice:'',metrics:null,benchmark:null,hotspots:[]};
    const saved=loadSession();
    if(saved){this.camera.restore(saved.camera);this.status.settings=saved.settings;this.status.mode=saved.mode;this.game.setMode(saved.mode);this.game.restorePlayer(saved.player);this.status.discoveries=saved.discoveries;this.status.puzzle=saved.puzzle;this.game.world.fountain=saved.fountain;this.game.world.time=saved.time;this.status.solved=saved.fountain;}
    this.status.wet=waterNetwork(this.status.puzzle).wet;
  }
  async initialize(engine:EngineId,started:number,progress:(label:string)=>void){
    // Module import is client-only and engine-specific; the other engine stays unloaded.
    if(engine==='three'){const {ThreeAdapter}=await import('../three/renderer');this.adapter=new ThreeAdapter();}
    else {const {BabylonAdapter}=await import('../babylon/renderer');this.adapter=new BabylonAdapter();}
    if(this.disposed)return;
    try{await this.adapter.initialize(this.canvas,this.status.settings,progress);}
    catch(e){this.adapter.dispose();throw e;}
    if(this.disposed){this.adapter.dispose();return;}
    this.resize();
    this.adapter.render(this.camera.value,this.game.world,0);
    this.loadMs=performance.now()-started;
    const gl=this.canvas.getContext('webgl2');
    this.context=gl?`${gl.getParameter(gl.VERSION)} · ${gl.getParameter(gl.RENDERER)} · MSAA ${gl.getParameter(gl.SAMPLES)}`:'計測不可';
    this.input=new SharedInput(this.canvas,this.camera,(x,y)=>this.tap(x,y),()=>this.interact());
    this.observer=new ResizeObserver(()=>this.resize());this.observer.observe(this.canvas.parentElement!);
    document.addEventListener('visibilitychange',()=>{
      this.input.clear();this.previous=0;this.metricFrames=0;this.metricStart=0;
      if(this.benchmarkStart!==null && document.hidden)this.cancelBenchmark('タブが非表示になったため計測を中止しました。');
    },{signal:this.abort.signal});
    this.canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();this.status.paused=true;this.notice('描画コンテキストが失われました。ページを再読み込みしてください。',600);},{signal:this.abort.signal});
    this.status.ready=true;this.emit();this.raf=requestAnimationFrame(t=>this.frame(t));
  }
  private resize(){
    const rect=this.canvas.parentElement!.getBoundingClientRect();
    const width=Math.max(1,Math.floor(rect.width)),height=Math.max(1,Math.floor(rect.height));
    if(this.benchmarkStart!==null && (this.width!==width || this.height!==height))this.cancelBenchmark('画面サイズが変わったため計測を中止しました。');
    this.width=width;this.height=height;this.ratio=Math.min(window.devicePixelRatio||1,QUALITY[this.status.settings.quality].dpr);
    this.adapter.resize(this.width,this.height,this.ratio);
  }
  private frame(now:number){
    if(this.disposed)return;
    this.raf=requestAnimationFrame(t=>this.frame(t));
    if(document.hidden){this.previous=0;return;}
    const dt=this.previous?Math.max(0,(now-this.previous)/1000):1/60;this.previous=now;
    this.game.update(dt,this.benchmarkStart!==null?{x:0,z:0}:this.input.value(),this.camera.value.azimuth,this.status.paused || this.status.puzzleOpen);
    if(this.game.world.mode==='explore')this.camera.follow(this.game.world.player.position,Math.min(dt,.1));else this.camera.update(Math.min(dt,.1));
    this.adapter.render(this.camera.value,this.game.world,dt);
    this.metricStart ||= now;this.metricFrames++;
    if(this.benchmarkStart!==null)this.sample(now);
    if(now-this.lastUi>100){
      this.lastUi=now;
      this.status.nearby=this.status.mode==='explore'?(nearestLandmark(this.game.world.player.position)??null):null;
      this.status.hotspots=LANDMARKS.map(l=>({id:l.id,...this.adapter.project({...l.position,y:l.position.y+1.0})}));
      if(now>=this.noticeUntil)this.status.notice='';
      if(now-this.metricStart>=1000){
        const elapsed=now-this.metricStart;
        this.status.metrics={engine:this.adapter.engine,version:this.adapter.version,fps:this.metricFrames*1000/elapsed,frameMs:elapsed/this.metricFrames,
          ...this.adapter.stats(),loadMs:this.loadMs,resolution:`${this.canvas.width} × ${this.canvas.height}`,quality:this.status.settings.quality,comparison:this.status.settings.comparison,night:this.status.settings.night};
        this.metricStart=now;this.metricFrames=0;
      }
      this.emit();
    }
  }
  private tap(x:number,y:number){
    if(this.benchmarkStart!==null || this.status.puzzleOpen)return;
    const hit=this.adapter.pick(x,y);if(!hit)return;
    const landmark=landmarkAt(hit.point);
    if(this.status.mode==='diorama'){if(landmark)this.select(landmark.id);}
    else if(landmark && this.status.nearby?.id===landmark.id)this.select(landmark.id);
    else if(!this.game.moveTo({...hit.point,y:.1}))this.notice('そこへは歩いて行けません。石畳の道をタップしてください。');
  }
  select(id:string){
    if(this.benchmarkStart!==null)return;
    const l=LANDMARKS.find(l=>l.id===id);if(!l)return;
    if(this.status.mode==='explore' && nearestLandmark(this.game.world.player.position)?.id!==id){this.notice('近くまで歩いてから調べよう。');return;}
    this.status.selected=l;
    if(!this.status.discoveries.includes(id)){this.status.discoveries=[...this.status.discoveries,id];this.notice('新しい発見を手帳に記録しました。');}
    if(this.status.mode==='diorama')this.camera.focus(l.position,id==='aqueduct'?27:16);
    this.save();this.emit();
  }
  interact(){if(this.status.nearby)this.select(this.status.nearby.id);}
  setMode(mode:GameMode){
    if(this.benchmarkStart!==null)return;
    this.status.mode=mode;this.game.setMode(mode);this.status.selected=null;this.input.clear();
    if(mode==='diorama')this.camera.reset();this.save();this.emit();
  }
  configure(partial:Partial<Settings>){
    if(this.benchmarkStart!==null)return;
    this.status.settings={...this.status.settings,...partial};this.adapter.configure(this.status.settings);this.resize();this.save();this.emit();
  }
  openPuzzle(){if(this.status.selected?.id!=='aqueduct' || this.benchmarkStart!==null)return;this.status.puzzleOpen=true;this.input.clear();this.emit();}
  closePuzzle(){this.status.puzzleOpen=false;this.emit();}
  turnPipe(index:number){
    if(this.status.solved || !this.status.puzzleOpen)return;
    this.status.puzzle=rotatePipe(this.status.puzzle,index);
    const result=waterNetwork(this.status.puzzle);this.status.wet=result.wet;
    if(result.solved){this.status.solved=true;this.game.succeed();this.notice('水が届いた！広場に、噴水の音が戻りました。',12);}
    this.save();this.emit();
  }
  resetPuzzle(){this.status.puzzle=createPuzzle();this.status.wet=waterNetwork(this.status.puzzle).wet;this.status.solved=false;this.game.world.fountain=false;this.game.world.celebration=0;this.save();this.emit();}
  pause(){if(this.benchmarkStart!==null)return;this.status.paused=!this.status.paused;this.input.clear();this.emit();}
  clearSelection(){this.status.selected=null;this.emit();}
  notice(text:string,seconds=4){this.status.notice=text;this.noticeUntil=performance.now()+seconds*1000;this.emit();}
  benchmark(){
    if(this.benchmarkStart!==null)return;
    this.status.puzzleOpen=false;this.status.selected=null;this.status.paused=false;this.status.mode='diorama';this.game=new RomanGame();this.camera.restore(cloneCamera());
    this.input.clear();this.benchmarkStart=performance.now();this.sampleStart=null;this.sampleFrames=0;this.drawSum=0;this.triSum=0;this.sampleStats=0;this.status.benchmark=10;
    this.input.enabled=false;
    this.notice('共通の初期視点で計測中。2秒準備 + 8秒サンプル。',10);
  }
  private sample(now:number){
    const elapsed=now-this.benchmarkStart!;this.status.benchmark=Math.max(0,Math.ceil((10000-elapsed)/1000));
    if(elapsed<2000)return;
    if(this.sampleStart===null){this.sampleStart=now;return;}
    this.sampleFrames++;const s=this.adapter.stats();
    if(s.drawCalls!==null)this.drawSum+=s.drawCalls;if(s.triangles!==null)this.triSum+=s.triangles;this.sampleStats++;
    if(now-this.sampleStart<8000)return;
    const ms=now-this.sampleStart;
    const record:Measurement={engine:this.adapter.engine,version:this.adapter.version,fps:this.sampleFrames*1000/ms,frameMs:ms/this.sampleFrames,
      ...s,drawCalls:s.drawCalls===null?null:Math.round(this.drawSum/this.sampleStats),triangles:s.triangles===null?null:Math.round(this.triSum/this.sampleStats),
      loadMs:this.loadMs,resolution:`${this.canvas.width} × ${this.canvas.height}`,quality:this.status.settings.quality,comparison:this.status.settings.comparison,night:this.status.settings.night,
      timestamp:new Date().toISOString(),userAgent:navigator.userAgent,viewport:`${this.width} × ${this.height}`,dpr:this.ratio,sampleSeconds:ms/1000,
      camera:cloneCamera(),asset:'roman-town-v1-seed42',fountain:false,context:this.context,protocol:'initial-camera/2s-warmup/8s-sample/no-input/v1'};
    const saved=saveRecord(record);this.status.metrics=record;
    this.benchmarkStart=null;this.status.benchmark=null;this.input.enabled=true;
    this.notice(saved?'計測を保存しました。比較ページで同条件の記録を確認できます。':'計測しました。保存が無効なため JSON を書き出してください。',7);
    this.latestMeasurement=record;this.emit();
  }
  latestMeasurement:Measurement|null=null;
  private cancelBenchmark(message:string){this.benchmarkStart=null;this.status.benchmark=null;this.input.enabled=true;this.notice(message);}
  exportMetrics(){
    if(!this.latestMeasurement){this.notice('先に「10秒計測」で測定記録を作成してください。');return;}
    download(new Blob([JSON.stringify(this.latestMeasurement,null,2)],{type:'application/json'}),`mirai-${this.adapter.engine}-metrics.json`);
  }
  screenshot(){
    if(this.benchmarkStart!==null)return;
    // Shared 1440 × 960 physical framebuffer, original camera and animation time.
    this.adapter.resize(1440,960,1);this.adapter.render(this.camera.value,this.game.world,0);
    const image=this.adapter.capture();
    const shot={engine:this.adapter.engine,image,timestamp:new Date().toISOString(),camera:cloneCamera(this.camera.value),settings:{...this.status.settings},time:this.game.world.time,fountain:this.game.world.fountain,resolution:'1440 × 960'};
    const saved=saveShot(shot);download(image,`mirai-roma-${this.adapter.engine}-${this.status.settings.night?'night':'day'}.png`);
    download(new Blob([JSON.stringify({...shot,image:undefined},null,2)],{type:'application/json'}),`mirai-roma-${this.adapter.engine}-camera.json`);
    this.resize();this.adapter.render(this.camera.value,this.game.world,0);
    this.notice(saved?'PNG と撮影条件 JSON を保存しました。':'PNG を保存しました。ブラウザ内の画像保存は容量制限でできませんでした。');
  }
  session():Session{return {version:1,camera:cloneCamera(this.camera.value),settings:{...this.status.settings},mode:this.status.mode,player:this.game.world.player,discoveries:this.status.discoveries,puzzle:this.status.puzzle,fountain:this.game.world.fountain,time:this.game.world.time};}
  save(){return saveSession(this.session());}
  private emit(){if(!this.disposed)this.callback({...this.status,settings:{...this.status.settings},discoveries:[...this.status.discoveries]});}
  dispose(){this.save();this.disposed=true;cancelAnimationFrame(this.raf);this.observer?.disconnect();this.abort.abort();this.input?.dispose();if(this.status.ready)this.adapter.dispose();}
}
