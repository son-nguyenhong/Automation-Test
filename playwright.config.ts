import { defineConfig, devices } from '@playwright/test';
import * as fs from 'fs';

const BASE_URL = process.env.BASE_URL || 'https://ops-aad.ehr-test.vib';
const AUTH_FILE = process.env.AUTH_FILE || './auth.json';
const hasAuth = fs.existsSync(AUTH_FILE);

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: process.env.CI ? 1 : undefined,

  reporter: [
    ['html', { outputFolder: 'reports/html', open: 'never' }],
    ['./src/core/custom-reporter.ts', { outputDir: './reports' }],
    ['list'],
  ],

  timeout: 60000,
  expect: { timeout: 10000 },

  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
    navigationTimeout: 30000,
    actionTimeout: 15000,
    viewport: { width: 1920, height: 1080 },
    ignoreHTTPSErrors: true,
  },

  outputDir: './reports/test-results',

  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        channel: 'chrome',
        ...(hasAuth ? { storageState: AUTH_FILE } : {}),
      },
    },
    {
      name: 'no-auth',
      use: {
        ...devices['Desktop Chrome'],
      },
    },
    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        ...(hasAuth ? { storageState: AUTH_FILE } : {}),
      },
    },
  ],
});
