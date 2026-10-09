import { test as base, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
const root = resolve('.output/public');
const mime: Record<string,string> = { '.html':'text/html', '.js':'text/javascript', '.mjs':'text/javascript', '.css':'text/css', '.json':'application/json', '.glb':'model/gltf-binary', '.png':'image/png', '.jpg':'image/jpeg', '.webp':'image/webp', '.svg':'image/svg+xml', '.ogg':'audio/ogg', '.m4a':'audio/mp4', '.ico':'image/x-icon' };
export const test = base.extend<{ staticAssets: void }>({
  staticAssets: [async ({ context }, use) => {
    if (process.env.MIRAI_OFFLINE_BROWSER === '1') {
      // Serve the actual prerendered production output through Playwright's
      // request interception, allowing WebGL QA without opening a TCP port.
      await context.route('http://museum.test/**', async route => {
        const path = decodeURIComponent(new URL(route.request().url()).pathname);
        const file = resolve(root, '.' + (extname(path) ? path : path.replace(/\/$/,'') + '/index.html'));
        if (!file.startsWith(root + '/')) { await route.fulfill({ status:403 }); return; }
        try { await route.fulfill({ body: await readFile(file), contentType: mime[extname(file)] || 'application/octet-stream' }); }
        catch { await route.fulfill({ status:404, body:'Not found' }); }
      });
      await context.route('https://fonts.googleapis.com/**', route => route.fulfill({ body:'',contentType:'text/css' }));
    }
    await use();
  }, { auto: true }],
});
export { expect };
