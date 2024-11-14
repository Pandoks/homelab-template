import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./schema/*.sql.ts",
  dialect: "postgresql",
  out: "./migrations",
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
