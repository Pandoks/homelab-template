import { defineConfig } from 'drizzle-kit';
import dotenv from 'dotenv';

const { parsed: env } = dotenv.config({ path: `.env.test` });
if (!env) throw new Error('Need .env.test');

const USER_DB_USERNAME = env.USER_DB_USERNAME;
const USER_DB_PASSWORD = env.USER_DB_PASSWORD;
const USER_DB_HOST = env.USER_DB_HOST;
const USER_DB_PORT = env.USER_DB_PORT;
const USER_DB_DATABASE = env.USER_DB_DATABASE;

if (
  !USER_DB_DATABASE ||
  !USER_DB_PORT ||
  !USER_DB_HOST ||
  USER_DB_PASSWORD === undefined ||
  USER_DB_PASSWORD === null ||
  !USER_DB_USERNAME
) {
  throw new Error('Database credentials is required');
}

export default defineConfig({
  schema: './src/lib/db/postgres/schema/*',
  dialect: 'postgresql',
  out: './src/lib/db/postgres/migrations',
  migrations: {
    prefix: 'timestamp' // compatible with Supabase
  },
  dbCredentials: {
    user: USER_DB_USERNAME,
    password: USER_DB_PASSWORD,
    host: USER_DB_HOST,
    port: parseInt(USER_DB_PORT),
    database: USER_DB_DATABASE,
    ssl: false // enable ssl for production databases
  },
  verbose: true,
  strict: true
});
