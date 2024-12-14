import { env } from '$env/dynamic/private';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

// add {prepare: false} if using "Transaction" pool mode in Supabase (serverless hosting)
// otherwise nothing needs to be changed for "Session" (long running hosting)
const mainClient = postgres(env.MAIN_DB_URL!);
export const mainDatabase = drizzle({ client: mainClient });
