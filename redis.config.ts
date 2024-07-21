const REDIS_MAIN_URL = process.env.REDIS_MAIN_URL;

if (!REDIS_MAIN_URL) {
  throw new Error('Redis credentials is required');
}

interface RedisInstanceConfig {
  url: string;
}

type RedisConfigs = {
  [key: string]: RedisInstanceConfig;
};

/**
 * You can define multiple redis instances if you need to, but it's better to have one when you
 * start out. Start separating concerns once a single instance can't handle the load. (NOTE: Make
 * sure to have separated name spaces if using only one instance)
 */
const redisConfig: RedisConfigs = {
  main: { url: REDIS_MAIN_URL }
};

export default redisConfig;
