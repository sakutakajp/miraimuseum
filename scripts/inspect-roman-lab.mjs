// Local Chromium inspection. Browser timings here are software-GPU measurements.
// Reuses the project's installed Playwright; does not download a browser.
import { chromium } from '@playwright/test';
import { mkdir,writeFile } from 'node:fs/promises';
const base=process.env.LAB_URL || 'http://127.0.0.1:3002';
const out=process.env.LAB_CAPTURE_DIR || '/tmp/roman-captures';
await mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
  for(const engine of ['three','babylon']){
    const context=await browser.newContext({viewport:{width:1440,height:1042},deviceScaleFactor:1});
    const page=await context.newPage();const errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    page.on('console',m=>{if(m.type()==='error')errors.push(m.text().slice(0,500));});
    await page.route('https://fonts.googleapis.com/**',r=>r.abort());
    await page.goto(base+'/lab/'+engine,{waitUntil:'domcontentloaded',timeout:60000});
    try{await page.waitForFunction(()=>document.querySelector('[data-testid="roman-lab"][data-ready="true"]') || document.querySelector('.lab-error'),{},{timeout:45000});if(await page.locator('.lab-error').count())throw new Error(await page.locator('.lab-error').innerText());}
    catch(e){await page.screenshot({path:out+'/'+engine+'-failed.png'});console.log('LOAD FAILED',engine,await page.locator('body').innerText(),errors);throw e;}
    await page.waitForTimeout(1500);
    await page.screenshot({path:out+'/'+engine+'-ui.png'});
    await writeFile(out+'/'+engine+'-day.png',Buffer.from((await page.locator('canvas.lab-canvas').evaluate(c=>c.toDataURL('image/png'))).split(',')[1],'base64'));
    await page.getByRole('button',{name:'計測パネル',exact:true}).click();
    console.log(engine,await page.locator('.lab-metrics').innerText());
    await page.screenshot({path:out+'/'+engine+'-metrics.png'});
    await page.getByRole('button',{name:'計測パネルを閉じる'}).click();
    await page.getByRole('button',{name:'夜に切り替える'}).click();
    await page.waitForTimeout(1000);
    await page.screenshot({path:out+'/'+engine+'-night-ui.png'});
    await writeFile(out+'/'+engine+'-night.png',Buffer.from((await page.locator('canvas.lab-canvas').evaluate(c=>c.toDataURL('image/png'))).split(',')[1],'base64'));
    await writeFile(out+'/'+engine+'-errors.json',JSON.stringify(errors,null,2));
    console.log(engine,'errors',errors);
    await context.close();
  }
}finally{await browser.close();}
