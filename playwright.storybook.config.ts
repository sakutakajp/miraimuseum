import { existsSync } from "node:fs";
import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/storybook",
  outputDir: "test-results/storybook",
  timeout: 150000,
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:6006",
    viewport: { width: 800, height: 900 },
    launchOptions: {
      args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--disable-dev-shm-usage"],
      executablePath:
        process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ||
        (existsSync("/usr/bin/chromium") ? "/usr/bin/chromium" : undefined),
    },
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "npm run preview-storybook",
    url: "http://127.0.0.1:6006",
    reuseExistingServer: false,
    timeout: 30000,
  },
});
