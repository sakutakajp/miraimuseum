import { existsSync } from "node:fs";
import { defineConfig } from "@playwright/test";
const executablePath =
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ||
  (existsSync("/usr/bin/chromium") ? "/usr/bin/chromium" : undefined);
export default defineConfig({
  testDir: "./tests/browser",
  timeout: 150_000,
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:3001",
    headless: true,
    launchOptions: { executablePath },
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npm run preview",
    url: "http://127.0.0.1:3001",
    env: { NITRO_PORT: "3001", NITRO_HOST: "0.0.0.0" },
    reuseExistingServer: false,
    timeout: 30_000,
  },
});
