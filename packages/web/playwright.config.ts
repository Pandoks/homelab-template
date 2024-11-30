import { type PlaywrightTestConfig } from '@playwright/test';

const config: PlaywrightTestConfig = {
  webServer: {
    command:
      /**
       * Web server will warn that some chunks are larger than 500 kb after minification.
       * This is ok since you are building in a test environment. It will go away when building for producation.
       */
      'pnpm run test:setup && NODE_ENV=test vite build --mode test && NODE_ENV=test PORT=4173 vite preview --mode test',
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
  reporter: process.env.CI ? 'github' : 'list'
};

export default config;
