import { CAMERA_INITIAL } from './types';
import type { CameraState, Vec3 } from './types';
export const clamp=(n:number,min:number,max:number)=>Math.max(min,Math.min(max,n));
export function cameraPosition(c:CameraState):Vec3{
  const flat=c.radius*Math.cos(c.elevation);
  return {x:c.target.x+Math.sin(c.azimuth)*flat,y:c.target.y+Math.sin(c.elevation)*c.radius,z:c.target.z+Math.cos(c.azimuth)*flat};
}
export function cloneCamera(c:CameraState=CAMERA_INITIAL):CameraState{return {...c,target:{...c.target}};}
export class SharedCamera {
  value=cloneCamera();
  private desired=cloneCamera();
  private focusing=false;
  orbit(dx:number,dy:number){
    this.focusing=false;
    this.value.azimuth-=dx*.006;
    this.value.elevation=clamp(this.value.elevation+dy*.004,.2,1.35);
  }
  zoom(delta:number){this.focusing=false;this.value.radius=clamp(this.value.radius*Math.exp(delta*.001),7,63);}
  pan(dx:number,dy:number){
    this.focusing=false;const scale=this.value.radius*.0015,a=this.value.azimuth;
    this.value.target.x=clamp(this.value.target.x+(-Math.cos(a)*dx+Math.sin(a)*dy)*scale,-14,14);
    this.value.target.z=clamp(this.value.target.z+(Math.sin(a)*dx+Math.cos(a)*dy)*scale,-12,12);
  }
  focus(target:Vec3,radius=16){this.desired={...cloneCamera(this.value),target:{...target},radius,elevation:.53};this.focusing=true;}
  reset(){this.desired=cloneCamera();this.focusing=true;}
  follow(target:Vec3,dt:number){
    const k=1-Math.exp(-dt*5);
    this.value.radius+=(9.5-this.value.radius)*k;
    this.value.elevation+=(.60-this.value.elevation)*k;
    for(const key of ['x','y','z'] as const)this.value.target[key]+=(target[key]+(key==='y'?.65:0)-this.value.target[key])*k;
  }
  update(dt:number){
    if(!this.focusing)return;
    const k=1-Math.exp(-dt*5);
    for(const key of ['radius','elevation','azimuth'] as const)this.value[key]+=(this.desired[key]-this.value[key])*k;
    for(const key of ['x','y','z'] as const)this.value.target[key]+=(this.desired.target[key]-this.value.target[key])*k;
  }
  restore(c:CameraState){this.value=cloneCamera(c);this.desired=cloneCamera(c);this.focusing=false;}
}
