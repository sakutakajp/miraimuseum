import type { Landmark, Vec3 } from './types';
export const LANDMARKS: Landmark[] = [
  { id: 'temple', title: '祈りの神殿', latin: 'TEMPLUM', category: '建築',
    description: '朝の光が、石の柱を静かに照らす。街を見守る、小さな神殿。',
    fact: '列柱と三角形の破風は、ローマの神殿を象徴する形。建物の正面に広い階段を設け、人々を迎えました。',
    position: { x: -5.8, y: 2, z: -3.9 }, bounds: { x: -5.8, z: -3.9, w: 7.2, d: 6.4 } },
  { id: 'aqueduct', title: '街へ続く水道橋', latin: 'AQUAEDUCTUS', category: '水の技術',
    description: '遠くの泉から運ばれる水。水路をつないで、広場の噴水を蘇らせよう。',
    fact: 'ローマの水道は、わずかな傾斜と重力で水を運びました。アーチは、石の重さを両側の柱に伝える構造です。',
    position: { x: .8, y: 2.7, z: -9 }, bounds: { x: 0, z: -9, w: 26, d: 1.4 } },
  { id: 'market', title: '色と香りの市場', latin: 'MERCATUS', category: '暮らし',
    description: '布のひさしの下に、果物と器が並ぶ。日々の暮らしが交わる場所。',
    fact: '市場には食べ物だけでなく、陶器や布も並びました。屋台と店が集まり、街の経済と交流を支えていました。',
    position: { x: 6.1, y: .6, z: .4 }, bounds: { x: 6.3, z: .4, w: 5.6, d: 2.7 } },
  { id: 'fountain', title: 'めぐり合いの噴水', latin: 'FONS', category: '広場',
    description: '水の音が戻れば、人々が集まる。広場の中心で、水道橋からの便りを待っている。',
    fact: '公共の噴水は、家庭に水道がない人々の大切な水汲み場でした。水を届ける仕組みは街の暮らしを変えました。',
    position: { x: .1, y: .8, z: .1 }, bounds: { x: .1, z: .1, w: 3.2, d: 3.2 } },
  { id: 'harbor', title: '小舟の船着き場', latin: 'PORTUS', category: '水辺',
    description: '川面に揺れる帆と、石の階段。街と、その向こうの世界をつなぐ岸辺。',
    fact: '道路とともに、川や海も重要な輸送路でした。船は穀物、油、ワインなど重い荷物を運びました。',
    position: { x: -1.1, y: .15, z: 7.3 }, bounds: { x: -1.2, z: 8.5, w: 7.8, d: 4.4 } },
];
export interface Obstacle { x: number; z: number; w: number; d: number }
export const OBSTACLES: Obstacle[] = [
  { x:-5.8,z:-3.9,w:7.2,d:6.4 },
  { x:-7.2,z:3.8,w:3.9,d:3.1 },{ x:-11.5,z:-2.2,w:2.65,d:2.9 },
  { x:-4.2,z:6.4,w:3.7,d:2.5 },{ x:5.4,z:3.5,w:3.4,d:2.95 },
  { x:9,z:5.7,w:3.1,d:2.45 },{ x:9.3,z:-3.6,w:2.6,d:3 },
  { x:4.6,z:-6.4,w:3.9,d:2.2 },{ x:-10.7,z:6.2,w:2.5,d:2.1 },
  { x:5.3,z:-1.4,w:4.1,d:2.1 },
  { x:4.8,z:.3,w:2.35,d:1.9 },{ x:7.8,z:.5,w:2.35,d:1.9 },
  { x:6.8,z:-4.25,w:2.35,d:1.9 },
  { x:.1,z:.1,w:2.95,d:2.95 },{ x:-3.6,z:1.7,w:.8,d:.8 },
  { x:-8.1,z:.8,w:4.9,d:.3 },{ x:6.8,z:6.9,w:5.7,d:.3 },
  { x:-12.8,z:1.9,w:.3,d:5.3 },{ x:12.2,z:-7.9,w:1.6,d:2 },
  ...Array.from({ length:9 },(_,i)=>({ x:-12.4+i*3.1,z:-9,w:.95,d:1.05 })),
  ...[[-12.4,-6.7],[-10.3,-6.7],[-2,-7],[2,-7.5],[-12.2,3.5],[12.2,4],[11.8,-1],[-6,1],
      [-10.4,2.4],[-2.5,3.8],[2.9,4],[11.8,-6.6],[-7.4,6.7],[3.1,-2.5]]
    .map(([x,z])=>({ x:x!,z:z!,w:.4,d:.4 })),
];
export const LIGHTS = [[-2.8,-2.7],[2.8,2.9],[-8,1.2],[8.9,2.6],[-1.6,6.8]];
export const RESIDENT_PATHS: [number,number][][] = [
  [[-1.8,2.2],[-1.8,4.8],[1.8,4.8],[1.8,2.2]],
  [[1.95,-2.2],[1.95,-5.2],[-1.7,-5.2],[-1.7,-2.2]],
  [[7.9,2],[10.7,2],[10.7,4.1],[7.6,4.1]],
  [[-10.4,-.2],[-10.4,1.5],[-9.5,1.5],[-9.5,-.2]],
  [[-.2,5.3],[2,5.3],[2,6.5],[-.2,6.5]],
  [[3.1,-5.2],[3.1,-8],[.5,-8],[.5,-5.2]],
  [[8.5,-5.3],[11,-5.3],[11,-7.9],[8.5,-7.9]],
];
export function landmarkAt(point: Vec3): Landmark | undefined {
  return LANDMARKS.find(l=>Math.abs(point.x-l.bounds.x)<=l.bounds.w/2 && Math.abs(point.z-l.bounds.z)<=l.bounds.d/2);
}
export function nearestLandmark(point: Vec3, radius=3.25): Landmark | undefined {
  return [...LANDMARKS].sort((a,b)=>distanceToBounds(point,a.bounds)-distanceToBounds(point,b.bounds))
    .find(l=>distanceToBounds(point,l.bounds)<radius);
}
function distanceToBounds(p: Vec3,b: Obstacle): number {
  return Math.hypot(Math.max(0,Math.abs(p.x-b.x)-b.w/2),Math.max(0,Math.abs(p.z-b.z)-b.d/2));
}
