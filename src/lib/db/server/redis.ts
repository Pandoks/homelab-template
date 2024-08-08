import { createClient, type RedisClientType, type RedisClusterType } from 'redis';
import {
  MAIN_REDIS_HOST,
  MAIN_REDIS_USERNAME,
  MAIN_REDIS_PASSWORD,
  MAIN_REDIS_PORT
} from '$env/static/private';
import { dev } from '$app/environment';

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
    tls: !dev
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
