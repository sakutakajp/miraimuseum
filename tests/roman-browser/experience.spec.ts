import { test,expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { cameraPosition } from '../../app/lab/shared/camera';
import { projectionFov } from '../../app/lab/shared/types';
import type { CameraState,Vec3 } from '../../app/lab/shared/types';

test.beforeEach(async({page})=>{await page.route('https://fonts.googleapis.com/**',r=>r.abort());});
async function ready(page:Page,engine:string){
  await page.goto('/lab/'+engine,{waitUntil:'domcontentloaded'});
  await expect(page.getByTestId('roman-lab')).toHaveAttribute('data-ready','true',{timeout:60000});
}
async function overview(page:Page){
  await page.getByRole('button',{name:'説明を閉じる'}).click().catch(()=>{});
  await page.getByRole('button',{name:'街全体を見渡す'}).click();
  await expect.poll(async()=>Number(JSON.parse((await page.getByTestId('roman-lab').getAttribute('data-camera'))!).radius)).toBeGreaterThan(49.8);
}
async function screenPoint(page:Page,p:Vec3){
  const c=JSON.parse((await page.getByTestId('roman-lab').getAttribute('data-camera'))!) as CameraState;
  const rect=(await page.locator('.lab-canvas').boundingBox())!;const eye=cameraPosition(c);
  const v=[p.x-eye.x,p.y-eye.y,p.z-eye.z];
  const f=[c.target.x-eye.x,c.target.y-eye.y,c.target.z-eye.z].map(n=>n/c.radius);
  const rl=Math.hypot(f[0]!,f[2]!);const r=[-f[2]!/rl,0,f[0]!/rl];
  const u=[r[1]!*f[2]!-r[2]!*f[1]!,r[2]!*f[0]!-r[0]!*f[2]!,r[0]!*f[1]!-r[1]!*f[0]!];
  const dot=(a:number[],b:number[])=>a.reduce((sum,n,i)=>sum+n*b[i]!,0);
  const depth=dot(v,f),tan=Math.tan(projectionFov(rect.width/rect.height)/2);
  return {x:rect.x+(1+dot(v,r)/depth/tan/(rect.width/rect.height))*rect.width/2,y:rect.y+(1-dot(v,u)/depth/tan)*rect.height/2};
}
for(const engine of ['three','babylon']){
  test(`${engine}: camera, five discoveries, puzzle, exploration and night`,async({page})=>{
    const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
    await ready(page,engine);const root=page.getByTestId('roman-lab');
    const before=JSON.parse((await root.getAttribute('data-camera'))!);
    await page.mouse.move(570,230);await page.mouse.down();await page.mouse.move(650,260,{steps:4});await page.mouse.up();
    await expect.poll(async()=>JSON.parse((await root.getAttribute('data-camera'))!).azimuth).not.toBe(before.azimuth);
    const rotated=JSON.parse((await root.getAttribute('data-camera'))!);
    await page.mouse.move(500,270);await page.mouse.down({button:'right'});await page.mouse.move(555,270,{steps:3});await page.mouse.up({button:'right'});
    await expect.poll(async()=>JSON.parse((await root.getAttribute('data-camera'))!).target.x).not.toBe(rotated.target.x);
    await page.mouse.wheel(0,-200);
    await expect.poll(async()=>JSON.parse((await root.getAttribute('data-camera'))!).radius).toBeLessThan(rotated.radius);
    await overview(page);
    for(const name of ['祈りの神殿','色と香りの市場','小舟の船着き場','めぐり合いの噴水']){
      await page.getByRole('button',{name:name+'を調べる',exact:true}).click();
      await expect(page.locator('.lab-discovery h2')).toHaveText(name);await overview(page);
    }
    await page.getByRole('button',{name:'街へ続く水道橋を調べる'}).click();
    await page.getByRole('button',{name:'水路パズルを遊ぶ'}).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    for(let i=0;i<12;i++){
      const tile=page.locator(`[data-pipe="${i}"]`);const rotation=Number(await tile.getAttribute('data-rotation'));
      for(let n=0;n<(4-rotation)%4;n++)if(await tile.isEnabled())await tile.click();
    }
    await expect(root).toHaveAttribute('data-solved','true');
    await expect(page.getByText('水が、街に届いた！')).toBeVisible();
    await page.getByRole('button',{name:'噴水を見に行く'}).click();
    await expect(page.locator('.lab-discovery h2')).toHaveText('めぐり合いの噴水');
    await expect(page.locator('.lab-discoveries')).toContainText('5 / 5');
    await page.getByRole('button',{name:'探索',exact:true}).click();
    await expect(root).toHaveAttribute('data-mode','explore');
    const x=Number(await root.getAttribute('data-player-x')),z=Number(await root.getAttribute('data-player-z'));
    await page.locator('.lab-canvas').focus();await page.keyboard.down('d');await page.waitForTimeout(1800);await page.keyboard.up('d');
    await expect.poll(async()=>Math.hypot(Number(await root.getAttribute('data-player-x'))-x,Number(await root.getAttribute('data-player-z'))-z)).toBeGreaterThan(.1);
    const dest=await screenPoint(page,{x:2,y:.1,z:4.8});await page.mouse.click(dest.x,dest.y);
    await expect.poll(async()=>Number(await root.getAttribute('data-player-x')),{timeout:30000}).toBeGreaterThan(1.1);
    await page.getByRole('button',{name:'夜に切り替える'}).click();await expect(root).toHaveAttribute('data-night','true');
    await page.getByRole('button',{name:'昼に切り替える'}).click();await expect(root).toHaveAttribute('data-night','false');
    expect(errors).toEqual([]);
  });
}
test('engine switch preserves the camera, night, discoveries and solved game',async({page})=>{
  await ready(page,'three');await page.getByRole('button',{name:'祈りの神殿を調べる'}).click();
  await page.getByRole('button',{name:'一時停止'}).click();await page.getByRole('button',{name:'夜に切り替える'}).click();
  await page.locator('.lab-engine-tabs').getByRole('link',{name:'Babylon.js'}).click();
  const root=page.getByTestId('roman-lab');await expect(root).toHaveAttribute('data-ready','true',{timeout:60000});
  await expect(root).toHaveAttribute('data-engine','babylon');await expect(root).toHaveAttribute('data-night','true');
  await expect(page.locator('.lab-discoveries')).toContainText('1 / 5');
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('mirai-roman-lab-v1')!).camera);
  const camera=JSON.parse((await root.getAttribute('data-camera'))!);expect(camera.radius).toBeCloseTo(saved.radius,1);expect(camera.azimuth).toBeCloseTo(saved.azimuth,2);
  expect(await page.locator('canvas.lab-canvas').count()).toBe(1);
});
test('comparison A and B render independently and store actual measurements',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  for(const engine of ['three','babylon']){
    await ready(page,engine);
    await page.getByRole('button',{name:'計測パネル',exact:true}).click();
    await page.getByRole('button',{name:'同条件で10秒計測'}).click();
    await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('mirai-roman-measurements-v1')||'[]').length),{timeout:60000}).toBe(engine==='three'?1:2);
    const record=await page.evaluate(()=>JSON.parse(localStorage.getItem('mirai-roman-measurements-v1')!).at(-1));
    expect(record.fps).toBeGreaterThan(0);expect(record.frameMs).toBeGreaterThan(0);expect(record.drawCalls).toBeGreaterThan(0);expect(record.sampleSeconds).toBeGreaterThanOrEqual(8);
    await page.getByRole('button',{name:'計測パネルを閉じる'}).click();
    await page.getByLabel('比較条件').selectOption('maximum');
    await expect(page.locator('.lab-scene-caption')).toContainText('ENGINE ENHANCED');
    await page.getByRole('button',{name:'計測パネル',exact:true}).click();
    await expect(page.locator('.lab-metrics')).toContainText('GPUメモリ / 消費電力');
    await page.getByLabel('比較条件').selectOption('fair');
  }
  await page.goto('/lab');await expect(page.getByText('同じ解像度・画質・昼夜・視点・ブラウザの記録です。')).toBeVisible();
  expect(errors).toEqual([]);
});
test('missing GLB gives a useful error and no stuck loading state',async({page})=>{
  await page.route('**/lab/roman-town.glb',r=>r.abort());await page.goto('/lab/babylon');
  await expect(page.getByRole('alert')).toContainText('箱庭を開けませんでした。',{timeout:60000});
  await expect(page.locator('.lab-loading')).toHaveCount(0);await expect(page.getByRole('link',{name:'比較ページへ戻る'})).toBeVisible();
});
test.describe('touch browsers',()=>{
  test.use({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2});
  for(const engine of ['three','babylon'])test(`${engine}: mobile framing, pinch, joystick and tap`,async({page})=>{
    await ready(page,engine);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    const root=page.getByTestId('roman-lab');const initial=JSON.parse((await root.getAttribute('data-camera'))!).radius;
    const cdp=await page.context().newCDPSession(page);
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:170,y:355,id:1},{x:210,y:355,id:2}]});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:140,y:355,id:1},{x:240,y:355,id:2}]});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    await expect.poll(async()=>JSON.parse((await root.getAttribute('data-camera'))!).radius).toBeLessThan(initial);
    await page.getByRole('button',{name:'探索',exact:true}).tap();
    const x=Number(await root.getAttribute('data-player-x'));
    const rect=(await page.locator('.lab-joystick').boundingBox())!;
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:rect.x+rect.width*.83,y:rect.y+rect.height*.5,id:3}]});
    await page.waitForTimeout(1800);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    await expect.poll(async()=>Number(await root.getAttribute('data-player-x'))).toBeGreaterThan(x+.08);
    const dest=await screenPoint(page,{x:1.7,y:.1,z:4.8});await page.touchscreen.tap(dest.x,dest.y);
    await expect.poll(async()=>Number(await root.getAttribute('data-player-x')),{timeout:30000}).toBeGreaterThan(1);
    await page.getByRole('button',{name:'夜に切り替える'}).tap();await expect(root).toHaveAttribute('data-night','true');
    await page.screenshot({path:`test-results/roman-${engine}-mobile.png`});
  });
});
