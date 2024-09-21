import { defineConfig } from "drizzle-kit";
import { Resource } from "sst";

export default defineConfig({
  schema: "./schema/*.sql.ts",
  dialect: "postgresql",
  out: "./migrations",
  migrations: {
    prefix: "timestamp", // compatible with Supabase
  },
  dbCredentials: {
    user: Resource.MainDatabase.username,
    password: Resource.MainDatabase.password,
    host: Resource.MainDatabase.host,
    port: Resource.MainDatabase.port,
    database: Resource.MainDatabase.name,
    // ssl: false, // NOTE: enable ssl for external db connections
  },
  verbose: true,
  strict: true,
});
