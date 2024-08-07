import { defineConfig } from 'drizzle-kit';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.test' });

const TEST_DB_URL = process.env.TEST_DB_URL;

if (!TEST_DB_URL) {
  throw new Error('Test database credentials are required for testing');
}

export default defineConfig({
  schema: './src/lib/db/postgres/schema/*',
  dialect: 'postgresql',
  out: './src/lib/db/postgres/migrations',
  migrations: {
    prefix: 'timestamp' // compatible with Supabase
  },
  dbCredentials: {
    url: TEST_DB_URL
  },
  verbose: true,
  strict: true
});
