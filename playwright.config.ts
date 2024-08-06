import type { PlaywrightTestConfig } from '@playwright/test';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.test' });

const config: PlaywrightTestConfig = {
  webServer: {
    command: 'npm run build && npm run preview',
    port: 4173
    // env: {
    //   NODE_ENV: 'test',
    //   TEST_DB_URL: process.env.TEST_DB_URL || '',
    //   TEST_REDIS_URL: process.env.TEST_REDIS_URL || ''
    // }
  },
  testDir: 'tests',
  testMatch: /(.+\.)?(test)\.[jt]s/
};

export default config;
