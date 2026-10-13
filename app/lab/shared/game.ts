import { RESIDENT_PATHS } from './scene';
import { PLAYER_SPEED, findPath, moveWithCollision } from './navigation';
import type { Vec3, WorldState, Actor } from './types';
export class RomanGame {
  world:WorldState={time:0,mode:'diorama',player:{position:{x:0,y:.1,z:3.8},yaw:Math.PI,walking:false,phase:0},
    residents:RESIDENT_PATHS.map(path=>({position:{x:path[0]![0],y:.1,z:path[0]![1]},yaw:0,walking:true,phase:0})),fountain:false,celebration:0};
  destination:Vec3|null=null;
  private path:Vec3[]=[];
  private waypoints=RESIDENT_PATHS.map(()=>1);
  private accumulator=0;
  moveTo(p:Vec3):boolean{
    const route=findPath(this.world.player.position,p);
    this.path=route;this.destination=route.length?p:null;return !!route.length;
  }
  setMode(mode:'diorama'|'explore'){this.world.mode=mode;this.path=[];this.destination=null;this.world.player.walking=false;}
  update(dt:number,input:{x:number;z:number},azimuth:number,paused=false){
    if(paused)return;
    // Game time, movement and deterministic animation advance together.
    this.accumulator+=Math.min(dt,.1);
    while(this.accumulator>=1/60){this.step(1/60,input,azimuth);this.accumulator-=1/60;}
  }
  private step(dt:number,input:{x:number;z:number},azimuth:number){
    this.world.time+=dt;this.world.celebration=Math.max(0,this.world.celebration-dt);
    if(this.world.mode==='explore'){
      let x=0,z=0;
      if(Math.hypot(input.x,input.z)>.05){
        this.path=[];this.destination=null;
        x=Math.cos(azimuth)*input.x+Math.sin(azimuth)*input.z;
        z=-Math.sin(azimuth)*input.x+Math.cos(azimuth)*input.z;
      }else if(this.path.length){
        const p=this.path[0]!,actor=this.world.player;
        x=p.x-actor.position.x;z=p.z-actor.position.z;
        if(Math.hypot(x,z)<.13){this.path.shift();if(!this.path.length)this.destination=null;x=0;z=0;}
      }
      const length=Math.hypot(x,z),actor=this.world.player;
      actor.walking=length>.01;
      if(actor.walking){
        actor.position=moveWithCollision(actor.position,x/length*PLAYER_SPEED*dt,z/length*PLAYER_SPEED*dt);
        actor.yaw=Math.atan2(x,z);actor.phase+=dt;
      }
    }
    this.world.residents.forEach((actor,i)=>{
      const route=RESIDENT_PATHS[i]!,target=route[this.waypoints[i]!]!;
      const dx=target[0]-actor.position.x,dz=target[1]-actor.position.z,d=Math.hypot(dx,dz);
      if(d<.08){this.waypoints[i]=(this.waypoints[i]!+1)%route.length;return;}
      actor.walking=this.world.celebration===0;
      if(actor.walking){actor.position.x+=dx/d*dt*.45;actor.position.z+=dz/d*dt*.45;actor.yaw=Math.atan2(dx,dz);actor.phase+=dt;}
    });
  }
  succeed(){this.world.fountain=true;this.world.celebration=5;}
  restorePlayer(actor:Actor){this.world.player={...actor,position:{...actor.position},walking:false};}
}
