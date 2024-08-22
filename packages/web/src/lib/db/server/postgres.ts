import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import {
  USER_DB_DATABASE,
  USER_DB_HOST,
  USER_DB_PASSWORD,
  USER_DB_PORT,
  USER_DB_USERNAME
} from '$env/static/private';
import { building } from '$app/environment';

const databases: { [keys: string]: PostgresJsDatabase } = {};

// add {prepare: false} if using "Transaction" pool mode in Supabase (serverless hosting)
// otherwise nothing needs to be changed for "Session" (long running hosting)
if (!building) {
  databases.main = drizzle(
    postgres({
      username: USER_DB_USERNAME,
      password: USER_DB_PASSWORD,
      host: USER_DB_HOST,
      port: parseInt(USER_DB_PORT),
      database: USER_DB_DATABASE
    })
  );
}

export const db = databases;
