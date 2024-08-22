/**
 * Copied directly from src/lib/db/server/redis.ts but converted to use dotenv to import env variables
 * so it can work with playwright testing
 */
import { createClient, type RedisClientType, type RedisClusterType } from 'redis';
import dotenv from 'dotenv';

const { parsed: env } = dotenv.config({ path: `.env.test` });
if (!env) throw new Error('Need .env.test');

const main = createClient({
  username: env.MAIN_REDIS_USERNAME,
  password: env.MAIN_REDIS_PASSWORD,
  socket: {
    host: env.MAIN_REDIS_HOST,
    port: parseInt(env.MAIN_REDIS_PORT)
  }
})
  .on('error', (err) => console.error('Main redis client error: ', err))
  .connect();

// can add more later
const [mainClient] = await Promise.all([main]);

export const redis = {
  main: { instance: mainClient as RedisClientType, type: 'client' }
};

export type RedisInstance = {
  instance: RedisClientType | RedisClusterType;
  type: 'client' | 'cluster';
};
