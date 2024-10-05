import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

const MAIN_DATABASE_USERNAME = process.env.MAIN_DATABASE_USERNAME;
const MAIN_DATABASE_PASSWORD = process.env.MAIN_DATABASE_PASSWORD;
const MAIN_DATABASE_HOST = process.env.MAIN_DATABASE_HOST;
const MAIN_DATABASE_PORT = process.env.MAIN_DATABASE_PORT;
const MAIN_DATABASE_NAME = process.env.MAIN_DATABASE_NAME;

// add {prepare: false} if using "Transaction" pool mode in Supabase (serverless hosting)
// otherwise nothing needs to be changed for "Session" (long running hosting)
export const database = drizzle(
  postgres({
    username: MAIN_DATABASE_USERNAME,
    password: MAIN_DATABASE_PASSWORD,
    host: MAIN_DATABASE_HOST,
    port: parseInt(MAIN_DATABASE_PORT!),
    database: MAIN_DATABASE_NAME,
  }),
);
