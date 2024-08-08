import { sveltekit } from '@sveltejs/kit/vite';
import { loadEnv } from 'vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [sveltekit()],
  test: {
    include: ['src/**/*.test.{js,ts}'],
    env: loadEnv('test', process.cwd(), ''),
    fileParallelism: false
  }
});
