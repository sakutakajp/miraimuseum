import { test, expect } from "./fixtures";
test.use({ hasTouch: true });
const home = '[data-testid="floating-earth-experience"]';
async function ready(page: import('@playwright/test').Page) {
  await expect(page.locator(home)).toHaveAttribute('data-earth-ready','true',{timeout:90000});
  await expect(page.locator(home)).toHaveAttribute('data-dinosaur-reveal','settled',{timeout:60000});
}
async function tapExhibit(page: import('@playwright/test').Page, id: 'dinosaur' | 'cybertruck', touch = false) {
  for (const [rx,ry] of [[.45,.62],[.6,.4],[.5,.5],[.65,.65],[.3,.65]]) {
    await page.getByTestId('earth-control').focus(); await page.keyboard.press('Home');
    await expect(page.getByTestId(`${id}-control`)).toBeVisible();
    const bounds=await page.getByTestId(`${id}-control`).boundingBox();
    if(!bounds)continue;
    const x=bounds.x+bounds.width*rx!,y=bounds.y+bounds.height*ry!;
    if(touch)await page.touchscreen.tap(x,y);else await page.mouse.click(x,y);
    await page.waitForTimeout(200);
    if(id==='dinosaur' && page.url().includes('/dinosaur'))return;
    if(id==='cybertruck' && await page.getByRole('dialog').isVisible())return;
  }
  throw new Error(`Visible ${id} could not be selected through its mesh`);
}
test('Babylon home keeps composition, controls, occlusion and enters the full 3D game', async ({page},info) => {
  const errors:string[]=[]; page.on('pageerror',error=>errors.push(error.message));
  await page.goto('/'); await ready(page);
  await expect(page.locator(home)).toHaveAttribute('data-engine','babylon');
  await expect(page.locator(home)).not.toHaveAttribute('data-cybertruck-source','glb');
  await page.screenshot({path:info.outputPath('home-desktop.png')});
  const control=page.getByTestId('earth-control'); await control.focus();
  for(let i=0;i<11;i++) await page.keyboard.press('Shift+ArrowRight');
  await expect(page.getByTestId('dinosaur-control')).toBeHidden();
  await page.keyboard.press('Home'); await expect(page.getByTestId('dinosaur-control')).toBeVisible();
  const before=Number(await page.locator(home).getAttribute('data-earth-yaw'));
  const box=await control.boundingBox(); await page.mouse.move(box!.x+box!.width/2,box!.y+box!.height/2); await page.mouse.down(); await page.mouse.move(box!.x+box!.width/2+35,box!.y+box!.height/2,{steps:4}); await page.mouse.up();
  await expect(page).toHaveURL(/\/$/); expect(Number(await page.locator(home).getAttribute('data-earth-yaw'))).not.toBe(before);
  await control.focus();await page.keyboard.press('Home');await tapExhibit(page,'dinosaur');
  await expect(page).toHaveURL(/dinosaur\?play=1/); await expect(page.locator('.deep-time-host')).toHaveAttribute('data-ready','true',{timeout:90000});
  await expect(page.locator('.deep-time-host')).toHaveAttribute('data-engine','babylon'); await expect(page.locator('canvas')).toHaveCount(1);
  await page.getByTestId('pause').click(); await page.screenshot({path:info.outputPath('game-pause.png')});
  await expect(page.getByTestId('resume')).toBeVisible(); await page.getByTestId('resume').click();
  await page.locator('canvas').focus(); await page.keyboard.press('Space'); await page.screenshot({path:info.outputPath('game-desktop.png')});
  await page.getByRole('button',{name:'ホームへ戻る',exact:true}).first().click();await ready(page);await expect(page.locator('canvas')).toHaveCount(1);
  expect(errors).toEqual([]);
});
test('saved unlock, silver car notice, language and portrait/landscape touch equivalents', async ({page},info) => {
  await page.addInitScript(()=>{localStorage.setItem('mirai-museum:deep-time:v1','{"cleared":true,"bestProgress":1,"bestClearScore":92000,"bestSync":0.8,"bestRank":"S","attempts":7}');localStorage.setItem('mirai-museum:language','en');});
  await page.setViewportSize({width:390,height:844}); await page.goto('/'); await ready(page);
  await expect(page.locator(home)).toHaveAttribute('data-cybertruck-reveal','settled',{timeout:60000});
  await page.getByTestId('earth-control').focus(); await page.keyboard.press('Home');
  await page.screenshot({path:info.outputPath('home-mobile-silver.png')});
  await tapExhibit(page,'cybertruck',true);
  await expect(page.getByRole('dialog')).toContainText('The next game is in development.');await page.getByRole('button',{name:'Close',exact:true}).click();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await tapExhibit(page,'dinosaur',true);await expect(page.locator('.deep-time-host')).toHaveAttribute('data-ready','true',{timeout:90000});
  await page.getByTestId('pause').click();await expect(page.getByTestId('resume')).toHaveText('Resume'); await page.setViewportSize({width:844,height:390});await page.screenshot({path:info.outputPath('game-landscape-pause.png')});
  await page.getByTestId('resume').click();await page.locator('canvas').dispatchEvent('pointerdown',{pointerId:1,isPrimary:true,pointerType:'touch',button:0});
  await page.getByTestId('pause').click();await page.getByLabel('Quality',{exact:true}).selectOption('low');
  expect(JSON.parse(await page.evaluate(()=>localStorage.getItem('mirai-museum:settings:v1')!)).quality).toBe('low');
});
test('optional model failure and Earth failure leave navigation and a retryable game', async({page})=>{
  await page.route('**/dinosaur.glb',route=>route.fulfill({status:503,body:'Unavailable'}));await page.goto('/');
  await expect(page.locator(home)).toHaveAttribute('data-earth-ready','true',{timeout:90000});await expect(page.locator(home)).toHaveAttribute('data-dinosaur-source','unavailable',{timeout:60000});
  await page.goto('/dinosaur');await expect(page.getByRole('button',{name:'再読み込み',exact:true})).toBeVisible({timeout:60000});
  await page.unroute('**/dinosaur.glb');await page.getByRole('button',{name:'再読み込み',exact:true}).click();await expect(page.getByTestId('start')).toBeVisible({timeout:90000});
  await page.route('**/earth-vivid.glb',route=>route.fulfill({status:503,body:'Unavailable'}));await page.goto('/');
  await expect(page.locator(home)).toHaveAttribute('data-renderer','static',{timeout:60000});await expect(page.getByRole('link',{name:'恐竜ゲームをはじめる'})).toBeVisible();
});
