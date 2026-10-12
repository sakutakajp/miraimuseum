import { existsSync } from 'node:fs';
import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/runtime-browser', timeout: 180000, workers: 1, outputDir: 'test-results/runtime',
  use: { baseURL: 'http://127.0.0.1:3003', headless: true, viewport: { width: 390, height: 844 },
    launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined), args: ['--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage'] },
    screenshot: 'only-on-failure', trace: { mode: 'retain-on-failure', screenshots: false } },
  webServer: { command: 'npm run dev -- --port 3003', url: 'http://127.0.0.1:3003', reuseExistingServer: false, timeout: 90000 },
});
