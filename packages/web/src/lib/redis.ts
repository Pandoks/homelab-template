import { building } from '$app/environment';
import { MAIN_REDIS_URL } from '$env/static/private';
import { createClient, type RedisClientType } from 'redis';

let mainRedis: RedisClientType;
if (!building) {
  const redis = createClient({ url: MAIN_REDIS_URL });
  mainRedis = (await redis.connect().catch((err) => {
    console.error('Redis Error:');
    console.error(err);
  })) as RedisClientType;
}
export { mainRedis };
