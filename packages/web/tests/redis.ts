import { createClient } from 'redis';

const main = createClient({
  url: process.env.MAIN_REDIS_URL
})
  .on('error', (err) => console.error('Main redis client error: ', err))
  .connect();

export const [mainRedis] = await Promise.all([main]);
