import { defineConfig } from "@playwright/test";
import labConfig from "./playwright.roman.config";

export default defineConfig(labConfig, {
  testDir: "./tests/browser",
  testMatch: "nyc-diorama.spec.ts",
  timeout: 90_000,
  use: { baseURL: process.env.NYC_URL || "http://127.0.0.1:3005", viewport: { width: 1280, height: 900 } },
  webServer: process.env.NYC_URL ? undefined : {
    command: "npm run preview",
    url: "http://127.0.0.1:3005",
    env: { NITRO_PORT: "3005", NITRO_HOST: "0.0.0.0" },
    reuseExistingServer: false,
    timeout: 30_000,
  },
});
