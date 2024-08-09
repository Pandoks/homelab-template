import { createClient, type RedisClientType, type RedisClusterType } from 'redis';
import { env } from '$env/dynamic/private';
import { building, dev } from '$app/environment';

const redisClients: { [key: string]: RedisInstance } = {};
if (!building) {
  const mainClient = createClient({
    username: env.MAIN_REDIS_USERNAME,
    password: env.MAIN_REDIS_PASSWORD,
    socket: {
      host: env.MAIN_REDIS_HOST,
      port: parseInt(env.MAIN_REDIS_PORT!),
      tls: !dev
    }
  })
    .on('error', (err) => console.error('Main redis client error: ', err))
    .connect();

  // can add more later
  const [mainRedis] = await Promise.all([mainClient]);

  redisClients.main = { instance: mainRedis as RedisClientType, type: 'client' };
}

export const redis = redisClients;

export type RedisInstance = {
  instance: RedisClientType | RedisClusterType;
  type: 'client' | 'cluster';
};
