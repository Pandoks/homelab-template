import { env } from '$env/dynamic/private';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

// add {prepare: false} if using "Transaction" pool mode in Supabase (serverless hosting)
// otherwise nothing needs to be changed for "Session" (long running hosting)
export const database = drizzle(
  postgres({
    username: env.USER_DB_USERNAME,
    password: env.USER_DB_PASSWORD,
    host: env.USER_DB_HOST,
    port: parseInt(env.USER_DB_PORT!),
    database: env.USER_DB_DATABASE
  })
);
