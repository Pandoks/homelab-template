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
    user: Resource.MainDatabaseUsername.value,
    password: Resource.MainDatabasePassword.value,
    host: Resource.MainDatabaseHost.value,
    port: parseInt(Resource.MainDatabasePort.value),
    database: Resource.MainDatabaseName.value,
    // ssl: false, // NOTE: enable ssl for external db connections
  },
  verbose: true,
  strict: true,
});
