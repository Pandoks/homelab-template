import { building } from '$app/environment';
import { env } from '$env/dynamic/private';
import { createClient, type RedisClientType } from 'redis';

let mainRedis = createClient({ url: env.MAIN_REDIS_URL });
if (!building) {
  mainRedis = (await mainRedis.connect().catch((err) => {
    console.error('Redis Error:');
    console.error(err);
  })) as RedisClientType;
}

export { mainRedis };
