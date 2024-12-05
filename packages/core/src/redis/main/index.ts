import { createClient } from "redis";

const MAIN_REDIS_PASSWORD = process.env.MAIN_REDIS_PASSWORD;
const MAIN_REDIS_HOST = process.env.MAIN_REDIS_HOST;
const MAIN_REDIS_PORT = process.env.MAIN_REDIS_PORT;

console.log("HERE:", MAIN_REDIS_PORT);
export const redis = createClient({
  password: MAIN_REDIS_PASSWORD,
  socket: {
    host: MAIN_REDIS_HOST,
    port: parseInt(MAIN_REDIS_PORT!),
  },
});
