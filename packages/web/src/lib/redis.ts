import { env } from '$env/dynamic/private';
import { createClient, type RedisClientType } from 'redis';

export const mainRedis = (await createClient({ url: env.MAIN_REDIS_URL })
  .connect()
  .catch((err) => {
    console.error('Redis Error:');
    console.error(err);
  })) as RedisClientType;
