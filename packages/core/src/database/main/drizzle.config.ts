// NOTE: This should only be used in dev/test environments
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/database/main/schema/*.sql.ts",
  dialect: "postgresql",
  out: "./src/database/main/migrations",
  migrations: {
    prefix: "timestamp", // compatible with Supabase
  },
  dbCredentials: {
    user: "user",
    password: "password",
    host: "localhost",
    port: 5432,
    database: "userdb",
  },
  verbose: true,
  strict: true,
});
