/**
 * Copied directly from src/lib/db/server/postgres.ts but converted to use dotenv to import env variables
 * so it can work with playwright testing
 */
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import dotenv from 'dotenv';

const { parsed: env } = dotenv.config({ path: `.env.test` });
if (!env) throw new Error('Need .env.test');

// add {prepare: false} if using "Transaction" pool mode in Supabase (serverless hosting)
// otherwise nothing needs to be changed for "Session" (long running hosting)
const main = drizzle(
  postgres({
    username: env.USER_DB_USERNAME,
    password: env.USER_DB_PASSWORD,
    host: env.USER_DB_HOST,
    port: parseInt(env.USER_DB_PORT),
    database: env.USER_DB_DATABASE,
    onnotice: () => {}
  })
);

export const db = { main: main };
