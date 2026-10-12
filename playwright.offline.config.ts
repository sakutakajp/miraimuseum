import { defineConfig } from '@playwright/test';
import production from './playwright.config';
process.env.MIRAI_OFFLINE_BROWSER = '1';
export default defineConfig({ ...production, webServer: undefined, outputDir: 'test-results/offline-production', use: { ...production.use, baseURL: 'http://museum.test' } });
