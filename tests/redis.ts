/**
 * Copied directly from src/lib/db/server/redis.ts but converted to use dotenv to import env variables
 * so it can work with playwright testing
 */
import { createClient, type RedisClientType, type RedisClusterType } from 'redis';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.test' });

const MAIN_REDIS_HOST = process.env.MAIN_REDIS_HOST;
const MAIN_REDIS_USERNAME = process.env.MAIN_REDIS_USERNAME;
const MAIN_REDIS_PASSWORD = process.env.MAIN_REDIS_PASSWORD;
const MAIN_REDIS_PORT = process.env.MAIN_REDIS_PORT;

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
    port: parseInt(MAIN_REDIS_PORT!)
  }
})
  .on('error', (err) => console.error('Main redis client error: ', err))
  .connect();

// can add more later
const [mainClient] = await Promise.all([main]);

export const redis = { main: { instance: mainClient as RedisClientType, type: 'client' } };

export type RedisInstance = {
  instance: RedisClientType | RedisClusterType;
  type: 'client' | 'cluster';
};
