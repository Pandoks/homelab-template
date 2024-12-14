import { createClient } from "redis";

export const redis = createClient({ url: process.env.MAIN_REDIS_URL });
