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
      fullyParallel: true
    }
  ],
  testDir: 'tests',
  globalSetup: './tests/global-setup.ts',
  globalTeardown: './tests/global-teardown.ts',
  reporter: process.env.CI ? 'blob' : 'list'
};

export default config;
