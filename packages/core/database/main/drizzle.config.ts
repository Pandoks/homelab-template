import { defineConfig } from "drizzle-kit";
import { Resource } from "sst";

export default defineConfig({
  schema: "./src/lib/db/postgres/schema/*",
  dialect: "postgresql",
  out: "./src/lib/db/postgres/migrations",
  migrations: {
    prefix: "timestamp", // compatible with Supabase
  },
  dbCredentials: {
    user: Resource.MainDatabase.username,
    password: Resource.MainDatabase.password,
    host: Resource.MainDatabase.host,
    port: Resource.MainDatabase.port,
    database: Resource.MainDatabase.name,
    ssl: false, // enable ssl for production databases
  },
  verbose: true,
  strict: true,
});
