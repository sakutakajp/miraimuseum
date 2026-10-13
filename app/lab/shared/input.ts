import type { SharedCamera } from './camera';
export class SharedInput {
  private pointers=new Map<number,{x:number;y:number}>();
  private down={x:0,y:0};
  private dragging=false;
  private panMode=false;
  private keys=new Set<string>();
  joystick={x:0,z:0};
  enabled=true;
  private abort=new AbortController();
  constructor(private canvas:HTMLCanvasElement,private camera:SharedCamera,private tap:(x:number,y:number)=>void,private interact:()=>void){
    const opts={signal:this.abort.signal};
    canvas.addEventListener('contextmenu',e=>e.preventDefault(),opts);
    canvas.addEventListener('pointerdown',e=>{
      if(!this.enabled)return;
      canvas.focus({preventScroll:true});canvas.setPointerCapture(e.pointerId);
      this.pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
      if(this.pointers.size===1){this.down={x:e.clientX,y:e.clientY};this.dragging=false;this.panMode=e.button===2 || e.shiftKey;}
      else this.dragging=true;
    },opts);
    canvas.addEventListener('pointermove',e=>{
      const old=this.pointers.get(e.pointerId);if(!old)return;
      const next={x:e.clientX,y:e.clientY};
      if(Math.hypot(next.x-this.down.x,next.y-this.down.y)>5)this.dragging=true;
      if(this.pointers.size===2){
        const other=[...this.pointers.entries()].find(([id])=>id!==e.pointerId)![1];
        const before=Math.hypot(old.x-other.x,old.y-other.y),after=Math.hypot(next.x-other.x,next.y-other.y);
        this.camera.zoom((before-after)*3);
        this.camera.pan((next.x-old.x)/2,(next.y-old.y)/2);
      }else if(this.dragging){
        if(this.panMode)this.camera.pan(next.x-old.x,next.y-old.y);else this.camera.orbit(next.x-old.x,next.y-old.y);
      }
      this.pointers.set(e.pointerId,next);
    },opts);
    const up=(e:PointerEvent)=>{
      if(!this.pointers.has(e.pointerId))return;
      if(!this.dragging && this.pointers.size===1 && e.type==='pointerup' && e.button===0){
        const rect=canvas.getBoundingClientRect();this.tap(e.clientX-rect.left,e.clientY-rect.top);
      }
      this.pointers.delete(e.pointerId);
    };
    canvas.addEventListener('pointerup',up,opts);canvas.addEventListener('pointercancel',up,opts);
    canvas.addEventListener('wheel',e=>{e.preventDefault();if(this.enabled)this.camera.zoom(e.deltaY);},{...opts,passive:false});
    window.addEventListener('keydown',e=>{
      if(!this.enabled)return;
      const tag=(e.target as HTMLElement)?.tagName;
      if(['INPUT','SELECT','TEXTAREA','BUTTON'].includes(tag))return;
      if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','w','a','s','d','W','A','S','D'].includes(e.key)){e.preventDefault();this.keys.add(e.key.toLowerCase());}
      if(e.key.toLowerCase()==='e' && !e.repeat)this.interact();
      if(e.key==='Home')this.camera.reset();
      if(e.key==='+' || e.key==='=')this.camera.zoom(-160);
      if(e.key==='-')this.camera.zoom(160);
    },opts);
    window.addEventListener('keyup',e=>this.keys.delete(e.key.toLowerCase()),opts);
    window.addEventListener('blur',()=>this.clear(),opts);
  }
  value(){
    const x=(this.keys.has('d')||this.keys.has('arrowright')?1:0)-(this.keys.has('a')||this.keys.has('arrowleft')?1:0)+this.joystick.x;
    const z=(this.keys.has('s')||this.keys.has('arrowdown')?1:0)-(this.keys.has('w')||this.keys.has('arrowup')?1:0)+this.joystick.z;
    return {x,z};
  }
  clear(){this.keys.clear();this.pointers.clear();this.joystick={x:0,z:0};}
  dispose(){this.abort.abort();this.clear();}
}
