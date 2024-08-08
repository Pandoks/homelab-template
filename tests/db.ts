/**
 * Copied directly from src/lib/db/server/postgres.ts but converted to use dotenv to import env variables
 * so it can work with playwright testing
 */
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.test' });

const USER_DB_HOST = process.env.USER_DB_HOST;
const USER_DB_PORT = process.env.USER_DB_PORT;
const USER_DB_DATABASE = process.env.USER_DB_DATABASE;
const USER_DB_PASSWORD = process.env.USER_DB_PASSWORD;
const USER_DB_USERNAME = process.env.USER_DB_USERNAME;

if (
  !USER_DB_DATABASE ||
  !USER_DB_PORT ||
  !USER_DB_HOST ||
  USER_DB_PASSWORD === undefined ||
  USER_DB_PASSWORD === null ||
  !USER_DB_USERNAME
) {
  throw new Error('Database credentials is required for postgres');
}
// add {prepare: false} if using "Transaction" pool mode in Supabase (serverless hosting)
// otherwise nothing needs to be changed for "Session" (long running hosting)
const main = drizzle(
  postgres({
    username: USER_DB_USERNAME,
    password: USER_DB_PASSWORD,
    host: USER_DB_HOST,
    port: parseInt(USER_DB_PORT!),
    database: USER_DB_DATABASE,
    onnotice: () => {}
  })
);

export const db = { main: main };
