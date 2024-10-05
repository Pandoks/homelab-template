import { defineConfig } from "drizzle-kit";

const MAIN_DATABASE_USERNAME = process.env.MAIN_DATABASE_USERNAME;
const MAIN_DATABASE_PASSWORD = process.env.MAIN_DATABASE_PASSWORD;
const MAIN_DATABASE_HOST = process.env.MAIN_DATABASE_HOST;
const MAIN_DATABASE_PORT = process.env.MAIN_DATABASE_PORT;
const MAIN_DATABASE_NAME = process.env.MAIN_DATABASE_NAME;

export default defineConfig({
  schema: "./schema/*.sql.ts",
  dialect: "postgresql",
  out: "./migrations",
  migrations: {
    prefix: "timestamp", // compatible with Supabase
  },
  dbCredentials: {
    user: MAIN_DATABASE_USERNAME,
    password: MAIN_DATABASE_PASSWORD,
    host: MAIN_DATABASE_HOST!,
    port: parseInt(MAIN_DATABASE_PORT!),
    database: MAIN_DATABASE_NAME!,
    // ssl: false, // NOTE: enable ssl for external db connections
  },
  verbose: true,
  strict: true,
});
