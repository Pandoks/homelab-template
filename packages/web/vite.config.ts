import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';
import { visualizer } from 'rollup-plugin-visualizer';
import { config } from 'dotenv';

export default defineConfig({
  plugins: [sveltekit(), visualizer()],
  envDir: '../..',
  test: {
    include: ['src/**/*.test.{js,ts}'],
    env: {
      ...config({ path: '../../.env' }).parsed
    },
    fileParallelism: false
  }
});
