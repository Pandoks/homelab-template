import { createClient, createCluster, type RedisClientType, type RedisClusterType } from 'redis';

// didn't use $env because test suite can't handle it
const MAIN_REDIS_HOST = process.env.MAIN_REDIS_HOST;
const MAIN_REDIS_PORT = process.env.MAIN_REDIS_PORT;
const MAIN_REDIS_USERNAME = process.env.MAIN_REDIS_USERNAME;
const MAIN_REDIS_PASSWORD = process.env.MAIN_REDIS_PASSWORD;

if (
  MAIN_REDIS_USERNAME === undefined ||
  MAIN_REDIS_USERNAME === null ||
  !MAIN_REDIS_PASSWORD === undefined ||
  !MAIN_REDIS_PASSWORD === null ||
  !MAIN_REDIS_HOST ||
  !MAIN_REDIS_PORT
) {
  throw new Error('Database credentials are required for redis');
}

const main = createClient({
  username: MAIN_REDIS_USERNAME,
  password: MAIN_REDIS_PASSWORD,
  socket: {
    host: MAIN_REDIS_HOST,
    port: parseInt(MAIN_REDIS_PORT!),
    tls: process.env.NODE_ENV === 'production'
  }
})
  .on('error', (err) => console.error('Main redis client error: ', err))
  .connect();

// can add more later
const [mainClient] = await Promise.all([main]);

export const redis =
  process.env.NODE_ENV === 'test'
    ? {
        // inject application code to use test db
        main: {
          instance: mainClient as RedisClientType,
          type: 'client'
        },
        // better to use so you don't accidentally delete dev db
        test: {
          instance: mainClient as RedisClientType,
          type: 'client'
        }
      }
    : { main: { instance: mainClient as RedisClientType, type: 'client' } };

export type RedisInstance = {
  instance: RedisClientType | RedisClusterType;
  type: 'client' | 'cluster';
};
