// playwright.config.ts
import type { PlaywrightTestConfig } from '@playwright/test';
import { devices } from '@playwright/test';

// eslint-disable-next-line
const isCI = (process.env as any).CI;

const config: PlaywrightTestConfig = {
  forbidOnly: !!isCI,
  timeout: 20000,
  expect: {
    timeout: 2000,
  },
  workers: isCI ? 2 : undefined,

  use: {
    // headless: false,
    trace: 'on-first-retry',
    // trace: 'retain-on-failure',
    navigationTimeout: 10000,
    // launchOptions: {
    //   slowMo: 50,
    // },
  },
  webServer: {
    command: 'yarn g:build-prod-serve',
    port: 1234,
    // port: 4000,
    timeout: 120 * 1000,
    reuseExistingServer: !isCI,
  },
  projects: [
    {
      name: 'chromium',
      testIgnore: [/performance/],
      retries: isCI ? 2 : 0,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'performance',
      testMatch: /performance/,
      retries: isCI ? 2 : 0,
      use: { ...devices['Desktop Chrome'] },
    },

    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },
  ],
};

export default config;
