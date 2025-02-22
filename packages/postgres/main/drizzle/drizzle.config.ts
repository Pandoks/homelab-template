/**
 * NOTE: This should only be used in dev/test environments
 * Default drizzle.config.ts so that you don't accidentally push to production
 * If you want production, specifically target drizzle-prod.config.ts
 */
import { defineConfig } from "drizzle-kit";
import { config } from "dotenv";

config({ path: "../../.env" }); // based off of package.json of this project
console.log(process.env.MAIN_DB_URL);

export default defineConfig({
  schema: "./main/drizzle/schema/*.sql.ts",
  dialect: "postgresql",
  out: "./main/setup",
  migrations: {
    prefix: "index",
  },
  dbCredentials: {
    url: process.env.MAIN_DB_URL!,
  },
  verbose: true,
  strict: true,
});
