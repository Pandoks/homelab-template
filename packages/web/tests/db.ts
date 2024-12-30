import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

// add {prepare: false} if using "Transaction" pool mode in Supabase (serverless hosting)
// otherwise nothing needs to be changed for "Session" (long running hosting)
const mainClient = postgres(process.env.MAIN_DB_URL!, { onnotice: () => {} });
export const mainDatabase = drizzle({ client: mainClient });
