import { type PlaywrightTestConfig } from '@playwright/test';

const config: PlaywrightTestConfig = {
  webServer: {
    command: 'vite preview --mode test --port 4173',
    port: 4173
  },
  projects: [
    {
      name: 'auth',
      testMatch: /auth\/(.+.)?test.ts/,
      fullyParallel: true,
      retries: 2, // runs 3 times (first run not counted as retry)
      timeout: 5 * 1000
    }
  ],
  testDir: 'tests',
  globalSetup: './tests/global-setup.ts',
  globalTeardown: './tests/global-teardown.ts',
  reporter: process.env.CI ? 'blob' : 'list'
};

export default config;
