import { existsSync } from "node:fs";
import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/star-dive-browser",
  outputDir: "test-results/star-dive",
  timeout: 60_000,
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:3003",
    viewport: { width: 390, height: 844 },
    headless: true,
    launchOptions: {
      executablePath:
        process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ||
        (existsSync("/usr/bin/chromium") ? "/usr/bin/chromium" : undefined),
    },
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npm run dev -- --port 3003",
    url: "http://127.0.0.1:3003",
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
