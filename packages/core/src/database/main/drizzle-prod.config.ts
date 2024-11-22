import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/database/main/schema/*.sql.ts",
  dialect: "postgresql",
  out: "./src/database/main/migrations",
  migrations: {
    prefix: "timestamp", // compatible with Supabase
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
