import { createClient } from 'redis';

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
