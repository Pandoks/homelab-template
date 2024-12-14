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
    url: process.env.MAIN_DB_URL!,
  },
  verbose: true,
  strict: true,
});
