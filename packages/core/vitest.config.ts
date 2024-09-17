import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["./**/*.test.{js,ts}"],
    fileParallelism: false,
  },
  esbuild: {
    target: "esnext",
  },
});
