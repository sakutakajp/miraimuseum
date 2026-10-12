import { existsSync } from "node:fs";
import { defineConfig } from "@playwright/test";
const executablePath =
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ||
  (existsSync("/usr/bin/chromium") ? "/usr/bin/chromium" : undefined);
export default defineConfig({
  testDir: "./tests/browser",
  outputDir: "test-results/production",
  timeout: 150_000,
  // Software WebGL shares GPU resources; parallel scenes distort quality sampling.
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:3001",
    headless: true,
    launchOptions: { executablePath, args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--disable-dev-shm-usage"] },
    screenshot: "only-on-failure",
    trace: { mode: "retain-on-failure", screenshots: false },
  },
  webServer: {
    command: "npm run preview",
    url: "http://127.0.0.1:3001",
    env: { NITRO_PORT: "3001", NITRO_HOST: "0.0.0.0" },
    reuseExistingServer: false,
    timeout: 30_000,
  },
});
