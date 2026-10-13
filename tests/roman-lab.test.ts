import { describe,it,expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { createPuzzle,rotatePipe,waterNetwork } from '../app/lab/shared/puzzle';
import { walkable,moveWithCollision,findPath,PLAYER_SPEED } from '../app/lab/shared/navigation';
import { RomanGame } from '../app/lab/shared/game';
import { cloneCamera } from '../app/lab/shared/camera';
import { validateSession,comparable } from '../app/lab/comparison/storage';
import type { Session,Measurement } from '../app/lab/comparison/storage';

describe('Roman water puzzle',()=>{
  it('starts dry, reaches the fountain through reciprocal pipe connections, and resets',()=>{
    const original=createPuzzle();expect(waterNetwork(original).solved).toBe(false);
    let board=original;
    for(let i=0;i<12;i++)while(board[i]!.rotation!==0)board=rotatePipe(board,i);
    const network=waterNetwork(board);expect(network.solved).toBe(true);
    expect(network.wet).toEqual(expect.arrayContaining([4,5,1,2,6,10,11]));
    // Rotating the elbow breaks the actual route, rather than a magic rotation code.
    expect(waterNetwork(rotatePipe(board,5)).solved).toBe(false);
    expect(waterNetwork(createPuzzle()).solved).toBe(false);
    expect(original).toEqual(createPuzzle());
  });
  it('four rotations restore a tile without mutating other tiles',()=>{
    const board=createPuzzle();let changed=board;
    for(let i=0;i<4;i++)changed=rotatePipe(changed,6);
    expect(changed).toEqual(board);
  });
});
describe('shared exploration',()=>{
  it('rejects buildings and the river while allowing the bridge',()=>{
    expect(walkable(-5.8,-3.9)).toBe(false);expect(walkable(5.4,3.5)).toBe(false);
    expect(walkable(.1,.1)).toBe(false);expect(walkable(0,9)).toBe(false);
    expect(walkable(11.1,9.4)).toBe(true);expect(walkable(0,3.8)).toBe(true);
  });
  it('cannot tunnel through the fountain or walk off the plinth',()=>{
    const p=moveWithCollision({x:.1,y:.1,z:3.8},0,-10);
    expect(p.z).toBeGreaterThan(1.7);expect(walkable(p.x,p.z)).toBe(true);
    const edge=moveWithCollision({x:0,y:.1,z:3.8},0,100);
    expect(edge.z).toBeLessThan(7.2);
  });
  it('finds a route around a blocked plaza without cutting corners',()=>{
    const start={x:0,y:.1,z:3.8},end={x:0,y:.1,z:-3.2};
    const path=findPath(start,end);expect(path.length).toBeGreaterThan(12);
    let last=start;
    for(const p of path){
      for(let t=0;t<=1;t+=.1)expect(walkable(last.x+(p.x-last.x)*t,last.z+(p.z-last.z)*t)).toBe(true);
      last=p;
    }
    expect(path.at(-1)).toEqual(end);
    expect(findPath(start,{x:-5.8,y:.1,z:-3.9})).toEqual([]);
  });
  it('walks the same distance at 30 and 120fps, and pauses all game time',()=>{
    const run=(fps:number)=>{const g=new RomanGame();g.setMode('explore');for(let i=0;i<fps;i++)g.update(1/fps,{x:0,z:1},0);return g;};
    const a=run(30),b=run(120);expect(a.world.player.position.z).toBeCloseTo(b.world.player.position.z,5);
    expect(a.world.player.position.z-3.8).toBeCloseTo(PLAYER_SPEED,5);
    const time=a.world.time;a.update(.1,{x:1,z:0},0,true);expect(a.world.time).toBe(time);
    a.succeed();expect(a.world.fountain).toBe(true);expect(a.world.celebration).toBe(5);
  });
});
function session():Session{const game=new RomanGame();return {version:1,camera:cloneCamera(),settings:{quality:'balanced',comparison:'fair',night:false},mode:'diorama',player:game.world.player,discoveries:[],puzzle:createPuzzle(),fountain:false,time:0};}
describe('comparison state',()=>{
  it('restores a valid cross-engine state and rejects corrupt or unsafe saved values',()=>{
    const s=session();expect(validateSession(s)).toEqual(s);
    expect(validateSession({...s,camera:{...s.camera,radius:Infinity}})).toBeNull();
    expect(validateSession({...s,settings:{...s.settings,quality:'unknown'}})).toBeNull();
    expect(validateSession({...s,player:{...s.player,position:{x:-5.8,y:.1,z:-3.9}}})).toBeNull();
    expect(validateSession({...s,puzzle:[]})).toBeNull();expect(validateSession(null)).toBeNull();
  });
  it('never considers different render conditions comparable',()=>{
    const a={quality:'balanced',comparison:'fair',night:false,resolution:'1440 × 960',viewport:'1440 × 960',dpr:1,asset:'roman-town-v1-seed42',fountain:false,protocol:'8s',userAgent:'same browser',camera:cloneCamera(),sampleSeconds:8.001} as Measurement;
    expect(comparable(a,{...a,sampleSeconds:8.015,engine:'babylon'})).toBe(true);
    for(const patch of [{quality:'mobile'},{comparison:'maximum'},{night:true},{resolution:'390 × 700'},{dpr:2},{fountain:true}])expect(comparable(a,{...a,...patch} as Measurement)).toBe(false);
  });
});
describe('actual shared GLB',()=>{
  it('ships a valid authored scene, packed PBR textures and every animation pivot',()=>{
    const bytes=readFileSync(new URL('../public/lab/roman-town.glb',import.meta.url));
    expect(bytes.toString('utf8',0,4)).toBe('glTF');expect(bytes.readUInt32LE(4)).toBe(2);
    expect(bytes.readUInt32LE(8)).toBe(bytes.length);
    const length=bytes.readUInt32LE(12);const gltf=JSON.parse(bytes.toString('utf8',20,20+length));
    expect(gltf.meshes.length).toBeGreaterThan(70);expect(gltf.images.length).toBe(6);
    expect(gltf.materials.some((m:{name:string})=>m.name==='travertine')).toBe(true);
    const names=new Set(gltf.nodes.map((n:{name:string})=>n.name));
    for(const name of ['boat','wind_13','resident_7','resident_7_leg_l','resident_7_arm_r','river_surface_water','fountain_surface_fountain_water'])expect(names.has(name)).toBe(true);
    expect(gltf.meshes.some((m:{primitives:{attributes:{POSITION:number}}[]})=>gltf.accessors[m.primitives[0]!.attributes.POSITION].count>10000)).toBe(true);
  });
});
