/**
 * NOTE: This should only be used in dev/test environments
 * Default drizzle.config.ts so that you don't accidentally push to production
 * If you want production, specifically target drizzle-prod.config.ts
 */
import { defineConfig } from "drizzle-kit";
import { config } from "dotenv";

config({ path: "../../../../../.env" });

export default defineConfig({
  schema: "./src/database/main/schema/*.sql.ts",
  dialect: "postgresql",
  out: "./src/database/main/dev",
  migrations: {
    prefix: "none",
  },
  dbCredentials: {
    user: process.env.USER_DB_USERNAME,
    password: process.env.USER_DB_PASSWORD,
    host: "localhost",
    port: parseInt(process.env.USER_DB_PORT!),
    database: process.env.USER_DB_DATABASE!,
  },
  verbose: true,
  strict: true,
});
