import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

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
