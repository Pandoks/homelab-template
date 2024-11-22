/**
 * Copied directly from src/lib/db/server/postgres.ts but converted to use dotenv to importprocess.env variables
 * so it can work with playwright testing
 */
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import dotenv from 'dotenv';

dotenv.config();

// add {prepare: false} if using "Transaction" pool mode in Supabase (serverless hosting)
// otherwise nothing needs to be changed for "Session" (long running hosting)
export const mainDb = drizzle(
  postgres({
    username: process.env.USER_DB_USERNAME,
    password: process.env.USER_DB_PASSWORD,
    host: process.env.USER_DB_HOST,
    port: parseInt(process.env.USER_DB_PORT!),
    database: process.env.USER_DB_DATABASE,
    onnotice: () => {}
  })
);
