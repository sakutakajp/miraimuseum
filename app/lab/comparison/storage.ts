import { CAMERA_INITIAL,QUALITY } from '../shared/types';
import { walkable } from '../shared/navigation';
import { createPuzzle } from '../shared/puzzle';
import type { Pipe } from '../shared/puzzle';
import type { Actor,CameraState,EngineId,FrameMetrics,GameMode,Settings } from '../shared/types';
export const SESSION_KEY='mirai-roman-lab-v1';
export const RECORD_KEY='mirai-roman-measurements-v1';
export const SHOT_KEY='mirai-roman-screenshots-v1';
export interface Session {
  version:1;camera:CameraState;settings:Settings;mode:GameMode;player:Actor;
  discoveries:string[];puzzle:Pipe[];fountain:boolean;time:number;
}
export interface Measurement extends FrameMetrics {
  timestamp:string;userAgent:string;viewport:string;dpr:number;sampleSeconds:number;
  camera:CameraState;asset:string;fountain:boolean;context:string;protocol:string;
}
export interface Shot { engine:EngineId;image:string;timestamp:string;camera:CameraState;settings:Settings;time:number;fountain:boolean;resolution:string }
const finite=(n:unknown)=>typeof n==='number' && Number.isFinite(n);
export function validateSession(value:unknown):Session|null{
  if(!value || typeof value!=='object')return null;
  const s=value as Session,c=s.camera;
  if(s.version!==1 || !c || !c.target || ![c.azimuth,c.elevation,c.radius,c.target.x,c.target.y,c.target.z].every(finite))return null;
  if(c.radius<7 || c.radius>63 || c.elevation<.2 || c.elevation>1.35 || Math.abs(c.target.x)>14 || Math.abs(c.target.z)>12 || Math.abs(c.target.y)>10)return null;
  if(!s.settings || !(s.settings.quality in QUALITY) || !['fair','maximum'].includes(s.settings.comparison) || typeof s.settings.night!=='boolean')return null;
  if(!['diorama','explore'].includes(s.mode) || !s.player || !s.player.position || ![s.player.position.x,s.player.position.y,s.player.position.z,s.player.yaw,s.player.phase].every(finite))return null;
  if(!walkable(s.player.position.x,s.player.position.z) || !finite(s.time) || s.time<0 || typeof s.fountain!=='boolean')return null;
  if(!Array.isArray(s.discoveries) || !s.discoveries.every(d=>['temple','aqueduct','market','fountain','harbor'].includes(d)))return null;
  if(!Array.isArray(s.puzzle) || s.puzzle.length!==12)return null;
  const canonical=createPuzzle();
  if(!s.puzzle.every((p,i)=>p && Number.isInteger(p.rotation) && p.rotation>=0 && p.rotation<=3 && JSON.stringify(p.ports)===JSON.stringify(canonical[i]!.ports)))return null;
  return s;
}
export function loadSession():Session|null{try{return validateSession(JSON.parse(localStorage.getItem(SESSION_KEY)??'null'));}catch{return null;}}
export function saveSession(session:Session):boolean{try{localStorage.setItem(SESSION_KEY,JSON.stringify(session));return true;}catch{return false;}}
export function readRecords():Measurement[]{try{const r=JSON.parse(localStorage.getItem(RECORD_KEY)??'[]');return Array.isArray(r)?r.filter(x=>x && ['three','babylon'].includes(x.engine) && Number.isFinite(x.fps) && x.sampleSeconds>0).slice(-20):[];}catch{return [];}}
export function saveRecord(record:Measurement):boolean{try{localStorage.setItem(RECORD_KEY,JSON.stringify([...readRecords(),record].slice(-20)));return true;}catch{return false;}}
export function readShots():Partial<Record<EngineId,Shot>>{try{const s=JSON.parse(localStorage.getItem(SHOT_KEY)??'{}');return s && typeof s==='object'?s:{};}catch{return {};}}
export function saveShot(shot:Shot):boolean{try{localStorage.setItem(SHOT_KEY,JSON.stringify({...readShots(),[shot.engine]:shot}));return true;}catch{return false;}}
export function comparable(a:Measurement,b:Measurement):boolean{
  const fields=['quality','comparison','night','resolution','viewport','dpr','asset','fountain','protocol'] as const;
  return fields.every(k=>a[k]===b[k]) && a.userAgent===b.userAgent && JSON.stringify(a.camera)===JSON.stringify(b.camera);
}
export function defaultSettings():Settings{return {quality:typeof window!=='undefined' && window.matchMedia('(max-width:700px)').matches?'mobile':'balanced',comparison:'fair',night:false};}
export function download(data:string|Blob,name:string){
  const url=typeof data==='string'?data:URL.createObjectURL(data);
  const a=document.createElement('a');a.href=url;a.download=name;a.click();
  if(typeof data!=='string')setTimeout(()=>URL.revokeObjectURL(url),1000);
}
export { CAMERA_INITIAL };
