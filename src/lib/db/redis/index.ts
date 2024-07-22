import { dev } from '$app/environment';
import {
  MAIN_REDIS_HOST,
  MAIN_REDIS_PASSWORD,
  MAIN_REDIS_PORT,
  MAIN_REDIS_USERNAME
} from '$env/static/private';
import { createClient, createCluster } from 'redis';

const main = createClient({
  username: MAIN_REDIS_USERNAME,
  password: MAIN_REDIS_PASSWORD,
  socket: {
    host: MAIN_REDIS_HOST,
    port: parseInt(MAIN_REDIS_PORT),
    tls: !dev
  }
})
  .on('error', (err) => console.error('Main redis client error: ', err))
  .connect();

const [mainClient] = await Promise.all([main]);

export const redis = {
  main: mainClient
};
