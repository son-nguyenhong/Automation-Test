import { defineConfig, devices } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'https://ops-aad.ehr-test.vib';

export default defineConfig({
  testDir: './tests',

  /* Global setup: auto-handle SSO login */
  globalSetup: './src/core/global-setup.ts',

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

    /* All tests use saved auth by default */
    storageState: './auth.json',

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
    /* Default: Chromium with auth (dùng cho VIB portal) */
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        channel: 'chrome',
        storageState: './auth.json',
      },
    },

    /* No-auth: cho test public sites (demo, etc) */
    {
      name: 'no-auth',
      use: {
        ...devices['Desktop Chrome'],
        storageState: undefined,
      },
    },

    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        storageState: './auth.json',
      },
    },
  ],
});
