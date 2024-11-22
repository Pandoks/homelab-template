import { defineConfig } from "vitest/config";
import { config } from "dotenv";

export default defineConfig({
  test: {
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
