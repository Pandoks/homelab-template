import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import {
  TEST_DB_URL,
  USER_DB_DATABASE,
  USER_DB_HOST,
  USER_DB_PASSWORD,
  USER_DB_PORT,
  USER_DB_USERNAME
} from '$env/static/private';

const testEnv = process.env.NODE_ENV === 'test';

if (
  !testEnv &&
  (!USER_DB_DATABASE ||
    !USER_DB_PORT ||
    !USER_DB_HOST ||
    USER_DB_PASSWORD === undefined ||
    USER_DB_PASSWORD === null ||
    !USER_DB_USERNAME)
) {
  throw new Error('Database credentials is required for postgres');
} else if (testEnv && !TEST_DB_URL) {
  throw new Error('Test database credentials is required for testing postgres');
}

// add {prepare: false} if using "Transaction" pool mode in Supabase (serverless hosting)
// otherwise nothing needs to be changed for "Session" (long running hosting)
const queryClient = testEnv
  ? postgres(TEST_DB_URL)
  : postgres({
      username: USER_DB_USERNAME,
      password: USER_DB_PASSWORD,
      host: USER_DB_HOST,
      port: parseInt(USER_DB_PORT),
      database: USER_DB_DATABASE
    });
export const db = drizzle(queryClient);
