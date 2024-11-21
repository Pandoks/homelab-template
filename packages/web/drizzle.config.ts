// NOTE: This should only be used in dev/test environments
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: '../core/src/database/main/schema/*.sql.ts',
  dialect: 'postgresql',
  migrations: {
    prefix: 'timestamp' // compatible with Supabase
  },
  dbCredentials: {
    user: 'user',
    password: 'password',
    host: 'localhost',
    port: 5432,
    database: 'userdb'
  },
  verbose: true,
  strict: true
});
