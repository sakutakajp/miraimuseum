import type { WorldState, Vec3 } from './types';
export interface Motion { node:string; position?:Vec3; rotation?:Vec3; visible?:boolean }
// Transform curves are engine-independent. Limb pivots are embedded in the GLB.
export function motions(world:WorldState):Motion[]{
  const t=world.time;
  const result:Motion[]=[];
  for(let i=0;i<14;i++)result.push({node:`wind_${i}`,rotation:{x:Math.sin(t*.8+i*.7)*.019,y:0,z:Math.cos(t*.65+i)*.016}});
  result.push({node:'boat',position:{x:-5.3+Math.sin(t*.13)*.5,y:-.03+Math.sin(t*1.1)*.035,z:9.65+Math.sin(t*.17)*.14},rotation:{x:Math.sin(t*.9)*.025,y:Math.sin(t*.17)*.06,z:Math.cos(t*.7)*.018}});
  for(const [i,actor] of [...world.residents,world.player].entries()){
    const swing=actor.walking?Math.sin(actor.phase*9)*.43:Math.sin(t*1.5+i)*.025;
    const cheering=i<7 && world.celebration>0;
    result.push({node:`resident_${i}`,position:{...actor.position,y:actor.position.y+(actor.walking?Math.abs(Math.sin(actor.phase*9))*.025:0)+(cheering?Math.max(0,Math.sin(t*8+i))*.15:0)},rotation:{x:0,y:actor.yaw,z:0},visible:i<7 || world.mode==='explore'});
    for(const side of ['l','r']){
      const sign=side==='l'?1:-1;
      result.push({node:`resident_${i}_leg_${side}`,rotation:{x:swing*sign,y:0,z:0}});
      result.push({node:`resident_${i}_arm_${side}`,rotation:{x:cheering?-2.5:-swing*sign*.8,y:0,z:cheering?sign*.32:0}});
    }
  }
  result.push({node:'fountain_surface_fountain_water',visible:world.fountain});
  return result;
}
export const RIPPLE_COUNT=22;
export const JET_COUNT=8;
export function ripples(t:number):{x:number;y:number;z:number;scale:number;alpha:number}[]{
  return Array.from({length:RIPPLE_COUNT},(_,i)=>({x:-12.7+(i*3.713)%25.3,y:-.075+Math.sin(t*.7+i)*.004,z:7.62+(i*.719)%3.75,scale:.14+(i%4)*.065+Math.sin(t*.9+i)*.025,alpha:.13+Math.sin(t*.6+i)*.06}));
}
export function fountainDrops(t:number):Vec3[]{
  return Array.from({length:JET_COUNT*8},(_,i)=>{
    const theta=(i%JET_COUNT)*Math.PI*2/JET_COUNT;
    const s=((Math.floor(i/JET_COUNT)/8)+t*.62)%1;
    const r=.26+s*.79;
    return {x:.1+Math.cos(theta)*r,y:1.91+.60*Math.sin(s*Math.PI)-1.4*s,z:.1+Math.sin(theta)*r};
  });
}
