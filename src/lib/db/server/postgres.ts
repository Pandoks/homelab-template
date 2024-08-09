import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { env } from '$env/dynamic/private';
import { building } from '$app/environment';

const databases: { [keys: string]: PostgresJsDatabase } = {};

// add {prepare: false} if using "Transaction" pool mode in Supabase (serverless hosting)
// otherwise nothing needs to be changed for "Session" (long running hosting)
if (!building) {
  databases.main = drizzle(
    postgres({
      username: env.USER_DB_USERNAME,
      password: env.USER_DB_PASSWORD,
      host: env.USER_DB_HOST,
      port: parseInt(env.USER_DB_PORT!),
      database: env.USER_DB_DATABASE
    })
  );
}

export const db = databases;
