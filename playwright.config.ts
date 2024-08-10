import { devices, type PlaywrightTestConfig } from '@playwright/test';

const config: PlaywrightTestConfig = {
  webServer: {
    command: 'vite preview --mode test',
    port: 4173
  },
  projects: [
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
      fullyParallel: true,
      use: { ...devices['Desktop Chrome'] }
    },
    {
      name: 'auth',
      testMatch: /auth\/(.+.)?test.ts/,
      fullyParallel: false,
      dependencies: ['setup']
    }
  ],
  testDir: 'tests'
};

export default config;
