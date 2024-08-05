import { dev } from '$app/environment';
import {
  MAIN_REDIS_HOST,
  MAIN_REDIS_PASSWORD,
  MAIN_REDIS_PORT,
  MAIN_REDIS_USERNAME,
  TEST_REDIS_URL
} from '$env/static/private';
import { createClient, createCluster } from 'redis';

const testEnv = process.env.NODE_ENV === 'test';

if (
  !testEnv &&
  (MAIN_REDIS_USERNAME === undefined ||
    MAIN_REDIS_USERNAME === null ||
    !MAIN_REDIS_PASSWORD === undefined ||
    !MAIN_REDIS_PASSWORD === null ||
    !MAIN_REDIS_HOST ||
    !MAIN_REDIS_PORT)
) {
  throw new Error('Database credentials is required for redis');
} else if (testEnv && !TEST_REDIS_URL) {
  throw new Error('Test database credentials is required for testing redis');
}
const main = createClient({
  username: MAIN_REDIS_USERNAME,
  password: MAIN_REDIS_PASSWORD,
  socket: {
    host: MAIN_REDIS_HOST,
    port: parseInt(MAIN_REDIS_PORT),
    tls: !dev
  }
})
  .on('error', (err) => console.error('Main redis client error: ', err))
  .connect();

const [mainClient] = await Promise.all([main]);

export const redis = testEnv
  ? { test: await createClient({ url: TEST_REDIS_URL }).connect() }
  : { main: mainClient };
