/**
 * NOTE: This should only be used in dev/test environments
 * Default drizzle.config.ts so that you don't accidentally push to production
 * If you want production, specifically target drizzle-prod.config.ts
 */
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/database/main/schema/*.sql.ts",
  dialect: "postgresql",
  out: "./src/database/main/dev",
  migrations: {
    prefix: "none",
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
