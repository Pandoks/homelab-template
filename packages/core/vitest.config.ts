import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    passWithNoTests: true,
    reporters: process.env.GITHUB_ACTIONS ? "github-actions" : "default",
    include: ["./**/*.test.{js,ts}"],
    fileParallelism: false,
    env: {
      MAIN_DB_URL: "postgresql://user:password@localhost:5432/userdb",
      MAIN_REDIS_URL: "redis://:password@localhost:6379",
      PUBLIC_DOMAIN: "localhost",
      PUBLIC_APP_NAME: "homelab-template",
    },
  },
  esbuild: {
    target: "esnext",
  },
});
