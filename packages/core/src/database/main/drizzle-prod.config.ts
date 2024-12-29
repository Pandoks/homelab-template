/**
 * WARN: DO NOT add this to any scripts.
 * You should manually specify this config file so you don't accidentally push to production
 */
import { defineConfig } from "drizzle-kit";
import { Resource } from "sst";

export default defineConfig({
  schema: "./src/database/main/schema/*.sql.ts",
  dialect: "postgresql",
  out: "./src/database/main/migrations",
  migrations: {
    prefix: "index",
  },
  dbCredentials: {
    user: Resource.MainDatabaseUsername.value,
    password: Resource.MainDatabasePassword.value,
    host: Resource.MainDatabaseHost.value,
    port: parseInt(Resource.MainDatabasePort.value),
    database: Resource.MainDatabaseName.value,
  },
  verbose: true,
  strict: true,
});
