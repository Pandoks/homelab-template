import { building } from '$app/environment';
import { redis } from '@startup-template/core/redis/main/index';
import type { RedisClientType } from 'redis';

let mainRedis: RedisClientType;
if (!building) {
  mainRedis = (await redis.connect().catch((err) => {
    console.error('Redis Error:');
    console.error(err);
  })) as RedisClientType;
}
export { mainRedis };
