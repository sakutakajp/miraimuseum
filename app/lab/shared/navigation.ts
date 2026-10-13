import { OBSTACLES } from './scene';
import type { Vec3 } from './types';
export const PLAYER_RADIUS=.19;
export const PLAYER_SPEED=2.5;
export function walkable(x:number,z:number,r=PLAYER_RADIUS): boolean {
  const bridge=x>10.35+r && x<11.85-r && z>7.1 && z<11.2-r;
  if(x < -13.45+r || x > 13.45-r || z < -11.35+r || (z>7.2-r && !bridge))return false;
  return !OBSTACLES.some(o=>Math.abs(x-o.x)<o.w/2+r && Math.abs(z-o.z)<o.d/2+r);
}
export function moveWithCollision(p:Vec3,dx:number,dz:number):Vec3 {
  // Substep long displacements, then slide along walls. Prevents tunnelling.
  const steps=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.08));
  let x=p.x,z=p.z;
  for(let i=0;i<steps;i++){
    if(walkable(x+dx/steps,z))x+=dx/steps;
    if(walkable(x,z+dz/steps))z+=dz/steps;
  }
  return {x,y:z>7.1 && x>10.35 && x<11.85 ? .48:.10,z};
}
const CELL=.4;
const grid=(n:number)=>Math.round(n/CELL);
const key=(x:number,z:number)=>`${x},${z}`;
export function findPath(start:Vec3,end:Vec3):Vec3[] {
  if(!walkable(end.x,end.z))return [];
  const sx=grid(start.x),sz=grid(start.z),tx=grid(end.x),tz=grid(end.z);
  if(!walkable(tx*CELL,tz*CELL))return [];
  const open=[{x:sx,z:sz,g:0,f:Math.hypot(tx-sx,tz-sz)}];
  const costs=new Map([[key(sx,sz),0]]),previous=new Map<string,string>();
  const closed=new Set<string>();
  while(open.length && closed.size<9000){
    open.sort((a,b)=>a.f-b.f);
    const n=open.shift()!;const k=key(n.x,n.z);
    if(closed.has(k))continue;
    if(n.x===tx && n.z===tz){
      const path:Vec3[]=[{...end}];let curr=k;
      while(previous.has(curr)){
        const [x,z]=curr.split(',').map(Number);
        path.unshift({x:x!*CELL,y:.1,z:z!*CELL});curr=previous.get(curr)!;
      }
      return path;
    }
    closed.add(k);
    for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]){
      const x=n.x+dx!,z=n.z+dz!;const nk=key(x,z);
      if(!walkable(x*CELL,z*CELL) || closed.has(nk))continue;
      if(dx && dz && (!walkable((n.x+dx)*CELL,n.z*CELL) || !walkable(n.x*CELL,(n.z+dz)*CELL)))continue;
      const g=n.g+Math.hypot(dx!,dz!);
      if(g>=(costs.get(nk)??Infinity))continue;
      costs.set(nk,g);previous.set(nk,k);open.push({x,z,g,f:g+Math.hypot(tx-x,tz-z)});
    }
  }
  return [];
}
