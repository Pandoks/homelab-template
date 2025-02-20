import { defineConfig } from "vitest/config";
import { config } from "dotenv";

export default defineConfig({
  test: {
    passWithNoTests: true,
    reporters: process.env.GITHUB_ACTIONS ? "github-actions" : "default",
    include: ["./**/*.test.{js,ts}"],
    fileParallelism: false,
    env: {
      ...config({ path: "../../.env" }).parsed,
    },
  },
  esbuild: {
    target: "esnext",
  },
});
