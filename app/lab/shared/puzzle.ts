export type Direction=0|1|2|3; // north, east, south, west
export interface Pipe { ports:Direction[]; rotation:number }
export const COLS=4,ROWS=3;
export const SOURCE=4,SINK=11;
const SHAPES:Direction[][]=[[0,1],[1,2],[2,3],[0,1,2],[1,3],[0,3],[0,2],[0,1], [0,2],[1,2],[0,1],[1,3]];
// The solution winds upwards from row 1, then down into row 2.
export const SOLUTION=[0,0,0,0,0,0,0,0,0,0,0,0];
export function createPuzzle():Pipe[]{return SHAPES.map((ports,i)=>({ports:[...ports],rotation:[1,2,1,3,1,1,1,2,3,2,1,1][i]!}));}
export function ports(pipe:Pipe):Direction[]{return pipe.ports.map(p=>(p+pipe.rotation)%4 as Direction);}
export function rotatePipe(board:Pipe[],index:number):Pipe[]{
  return board.map((p,i)=>({ports:[...p.ports],rotation:i===index?(p.rotation+1)%4:p.rotation}));
}
export function waterNetwork(board:Pipe[]):{wet:number[];solved:boolean}{
  const wet=new Set<number>();
  if(!board[SOURCE] || !ports(board[SOURCE]!).includes(3))return {wet:[],solved:false};
  const stack=[SOURCE];
  while(stack.length){
    const id=stack.pop()!;if(wet.has(id))continue;wet.add(id);
    const x=id%COLS,y=Math.floor(id/COLS);
    for(const p of ports(board[id]!)){
      const nx=x+[0,1,0,-1][p]!,ny=y+[-1,0,1,0][p]!;
      if(nx<0 || nx>=COLS || ny<0 || ny>=ROWS)continue;
      const ni=ny*COLS+nx;
      if(ports(board[ni]!).includes((p+2)%4 as Direction))stack.push(ni);
    }
  }
  return {wet:[...wet],solved:wet.has(SINK) && ports(board[SINK]!).includes(1)};
}
