/**
 * Copied directly from src/lib/db/server/redis.ts but converted to use dotenv to import env variables
 * so it can work with playwright testing
 */
import { createClient } from 'redis';
import dotenv from 'dotenv';

dotenv.config({ path: '../../../.env' });

const main = createClient({
  password: process.env.MAIN_REDIS_PASSWORD,
  socket: {
    host: process.env.MAIN_REDIS_HOST,
    port: parseInt(process.env.MAIN_REDIS_PORT!)
  }
})
  .on('error', (err) => console.error('Main redis client error: ', err))
  .connect();

export const [mainRedis] = await Promise.all([main]);
