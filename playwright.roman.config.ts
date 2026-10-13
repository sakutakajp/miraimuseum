import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir:'./tests/roman-browser',timeout:180000,workers:1,
  expect:{timeout:30000},
  use:{baseURL:process.env.LAB_URL||'http://127.0.0.1:3004',viewport:{width:1100,height:882},headless:true,
    launchOptions:{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE||'/usr/bin/chromium',args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']},
    screenshot:'only-on-failure',trace:'retain-on-failure'},
  webServer:process.env.LAB_URL?undefined:{command:'npm run preview',url:'http://127.0.0.1:3004',env:{NITRO_PORT:'3004',NITRO_HOST:'0.0.0.0'},reuseExistingServer:false,timeout:30000},
});
