// Tiny runtime effects use the same geometry / normals / instances in both engines.
export function rippleGeometry(){
  const positions:number[]=[],normals:number[]=[],indices:number[]=[];
  for(let i=0;i<=32;i++)for(const r of [.94,1]){
    const a=i*Math.PI*2/32;positions.push(Math.cos(a)*r,0,Math.sin(a)*r);normals.push(0,1,0);
  }
  for(let i=0;i<32;i++){const a=i*2;indices.push(a,a+2,a+1,a+1,a+2,a+3);}
  return {positions,normals,indices};
}
export function dropGeometry(){
  const positions=[0,.034,0,0,-.034,0,.022,0,0,0,0,.022,-.022,0,0,0,0,-.022];
  const normals=positions.map(n=>n/.03);
  const indices=[0,2,3,0,3,4,0,4,5,0,5,2,1,3,2,1,4,3,1,5,4,1,2,5];
  return {positions,normals,indices};
}
export function waterNormal(size=128):Uint8Array{
  const data=new Uint8Array(size*size*4);
  for(let z=0;z<size;z++)for(let x=0;x<size;x++){
    const a=x/size*Math.PI*2,b=z/size*Math.PI*2;
    const dx=Math.cos(a*3+b*2)*.23+Math.cos(a*7-b*4)*.13;
    const dz=Math.sin(b*4+a*2)*.2+Math.sin(b*9-a*3)*.09;
    const i=(z*size+x)*4;data[i]=Math.round((dx*.5+.5)*255);data[i+1]=Math.round((dz*.5+.5)*255);data[i+2]=246;data[i+3]=255;
  }
  return data;
}
