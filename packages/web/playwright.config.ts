import { type PlaywrightTestConfig } from '@playwright/test';

const config: PlaywrightTestConfig = {
  webServer: {
    command:
      // drizzle-kit push is used after vite build so that it gives time for database to setup
      'docker compose -p setup up -d && NODE_ENV=test vite build --mode test && drizzle-kit push --force && vite preview',
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
