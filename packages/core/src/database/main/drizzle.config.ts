import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/database/main/schema/*.sql.ts",
  dialect: "postgresql",
  out: "./src/database/main/migrations",
  migrations: {
    prefix: "timestamp", // compatible with Supabase
  },
  dbCredentials: {
    user: "user",
    password: "password",
    host: "userdb",
    port: 5432,
    database: "userdb",
  },
  verbose: true,
  strict: true,
});
