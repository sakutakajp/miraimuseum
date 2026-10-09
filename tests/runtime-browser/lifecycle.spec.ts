import { test, expect } from '@playwright/test';
import { writeFileSync } from 'node:fs';
async function runReady(page: import('@playwright/test').Page) {
  await expect(page.locator('.deep-time-host')).toHaveAttribute('data-ready','true',{timeout:120000});
  await page.waitForFunction(()=>!!(window as any).__deepTime);
}
test('real jump, pause, ten retries, authored clear, reward and repeated route disposal', async({page},info)=>{
  const errors:string[]=[]; page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/dinosaur?deepTimeDebug=1');await runReady(page);await page.getByTestId('start').click();await expect(page.locator('.deep-time-host')).toHaveAttribute('data-mode','running');
  await page.locator('canvas').focus();await page.keyboard.press('Space');
  await expect.poll(()=>page.evaluate(()=> (window as any).__deepTime.world.controller.runtime.world.state.playerVelocityY),{timeout:500}).toBeLessThan(0);
  await page.keyboard.press('Escape');const paused=await page.evaluate(()=>({...((window as any).__deepTime.world.controller.runtime.world.state)}));
  await page.waitForTimeout(150);expect(await page.evaluate(()=>({...((window as any).__deepTime.world.controller.runtime.world.state)}))).toEqual(paused);await page.getByTestId('resume').click();
  const before=await page.evaluate(()=>{const d=(window as any).__deepTime;d.world.controller.retry();return d.world.diagnostics();});
  const retries=await page.evaluate(()=>{const d=(window as any).__deepTime;for(let i=0;i<10;i++){d.tick(2);if(d.world.controller.mode==='dead')d.tick(.77);}return {metrics:d.world.diagnostics(),attempts:d.world.controller.attempts,resources:{...d.resources}};});
  expect(retries.attempts).toBeGreaterThanOrEqual(11);expect(retries.metrics.meshes).toBe(before.meshes);expect(retries.metrics.materials).toBe(before.materials);expect(retries.metrics.textures).toBe(before.textures);expect(retries.metrics.audioSources).toBeLessThanOrEqual(20);expect(retries.resources).toMatchObject({engines:1,scenes:1,loops:1,audioContexts:1});
  await page.evaluate(()=>{const d=(window as any).__deepTime;d.world.controller.retry();d.queueAuthoredJumps();d.tick(76.8);});
  await expect(page.getByTestId('retry')).toBeVisible();expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('mirai-museum:deep-time:v1')!))).toMatchObject({cleared:true,bestClearScore:100000,bestSync:1,bestRank:'S'});
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('mirai-museum:v2')!)['dinosaur-run'].stages['1'].cleared)).toBe(true);
  await page.screenshot({path:info.outputPath('clear-mobile.png')});
  await page.getByRole('button',{name:'ホームへ戻る',exact:true}).last().click();await expect(page.locator('[data-testid="floating-earth-experience"]')).toHaveAttribute('data-cybertruck-reveal','settled',{timeout:90000});
  await page.screenshot({path:info.outputPath('first-clear-reward.png')});
  const visits=[];
  for(let i=0;i<3;i++){
    await page.getByTestId('earth-control').focus();await page.keyboard.press('Home');await page.getByTestId('dinosaur-control').focus();await page.keyboard.press('Enter');await expect(page.locator('.deep-time-host')).toHaveAttribute('data-ready','true',{timeout:90000});await page.getByTestId('pause').click();await page.getByRole('button',{name:'ホームへ戻る',exact:true}).last().click();
    await expect(page.locator('[data-testid="floating-earth-experience"]')).toHaveAttribute('data-dinosaur-reveal','settled',{timeout:90000});
    const resource=await page.evaluate(()=>({...((window as any).__museum3d.resources)}));expect(resource).toMatchObject({engines:1,scenes:1,loops:1,audioContexts:0});visits.push(resource);await expect(page.locator('canvas')).toHaveCount(1);
  }
  expect(visits[2]).toEqual(visits[0]);writeFileSync(info.outputPath('resources.json'),JSON.stringify({before,retries,visits},null,2));expect(errors).toEqual([]);
});
test('six rendered 3D sections, touch, visibility, quality, context loss and retry',async({page},info)=>{
  await page.goto('/dinosaur?play=1&deepTimeDebug=1');await runReady(page);await expect(page.locator('.deep-time-host')).toHaveAttribute('data-mode','running');
  await page.evaluate(()=>{const d=(window as any).__deepTime;d.world.controller.retry();d.queueAuthoredJumps();d.world.runtime.stop();});
  let previous=0;
  for(const seconds of [3,17,31,39,55,73]){
    await page.evaluate(delta=>{const d=(window as any).__deepTime;d.tick(delta);d.world.update(0);d.world.runtime.scene.render();},seconds-previous);previous=seconds;
    await page.screenshot({path:info.outputPath(`section-${seconds}.png`)});
  }
  await page.evaluate(()=>{const d=(window as any).__deepTime;d.world.controller.retry();d.world.runtime.start();});
  await page.locator('canvas').dispatchEvent('pointerdown',{isPrimary:true,button:0,pointerType:'touch',pointerId:1});await page.evaluate(()=>(window as any).__deepTime.tick(.05));expect(await page.evaluate(()=>(window as any).__deepTime.world.controller.runtime.world.state.playerVelocityY)).toBeLessThan(0);
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});await expect(page.getByTestId('resume')).toBeVisible();expect(await page.evaluate(()=>(window as any).__deepTime.resources.loops)).toBe(0);
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'));});await page.getByLabel('画質',{exact:true}).selectOption('low');await page.getByTestId('resume').click();
  const metrics=await page.evaluate(()=>(window as any).__deepTime.world.diagnostics());expect(metrics.quality).toBe('low');writeFileSync(info.outputPath('low-quality-metrics.json'),JSON.stringify(metrics,null,2));
  await page.evaluate(()=>document.querySelector('canvas')!.getContext('webgl2')!.getExtension('WEBGL_lose_context')!.loseContext());await expect(page.getByRole('button',{name:'再読み込み',exact:true})).toBeVisible();
  expect(await page.evaluate(()=>(window as any).__deepTime.resources.engines)).toBe(0);await page.getByRole('button',{name:'再読み込み',exact:true}).click();await runReady(page);await expect(page.locator('canvas')).toHaveCount(1);
});
test('exit while a GLB is still loading aborts safely and leaves only the home Scene',async({page})=>{
  let release!:()=>void;const gate=new Promise<void>(resolve=>release=resolve);let requested=false;
  await page.route('**/dinosaur.glb',async route=>{requested=true;await gate;await route.continue().catch(()=>{});});
  await page.goto('/dinosaur?deepTimeDebug=1');await expect.poll(()=>requested,{timeout:120000}).toBe(true);
  // The loading screen has an actual return button: exercise Vue unmount during loading.
  await page.getByRole('button',{name:'ホームへ戻る',exact:true}).last().click();release();
  await expect(page.locator('[data-testid="floating-earth-experience"]')).toHaveAttribute('data-dinosaur-reveal','settled',{timeout:90000});
  expect(await page.evaluate(()=>({...((window as any).__museum3d.resources)}))).toMatchObject({engines:1,scenes:1,loops:1,audioContexts:0,assetLoads:0});
  await expect(page.locator('canvas')).toHaveCount(1);
});
test('normal render clock completes all fifty queued inputs with live audio and persists a reload',async({page},info)=>{
  await page.addInitScript(()=>localStorage.setItem('mirai-museum:settings:v1','{"quality":"low","volume":0.8,"muted":false}'));
  await page.goto('/dinosaur?deepTimeDebug=1');await runReady(page);await page.getByTestId('start').click();await expect(page.locator('.deep-time-host')).toHaveAttribute('data-mode','running');
  await page.evaluate(()=>(window as any).__deepTime.queueAuthoredJumps());
  await expect(page.getByTestId('retry')).toBeVisible({timeout:130000});
  const actual=await page.evaluate(()=>{const d=(window as any).__deepTime;return {result:d.world.controller.result,ticks:d.world.controller.runtime.world.clock.ticks,metrics:d.world.diagnostics(),syncError:d.world.audio.syncError};});
  expect(actual.ticks).toBe(18432);expect(actual.result).toMatchObject({score:100000,rank:'S',sync:1});expect(Math.abs(actual.syncError)).toBeLessThanOrEqual(.18);
  writeFileSync(info.outputPath('real-time-clear.json'),JSON.stringify(actual,null,2));
  await page.reload();await runReady(page);expect(await page.evaluate(()=>(window as any).__deepTime.world.controller.record.bestClearScore)).toBe(100000);
});
