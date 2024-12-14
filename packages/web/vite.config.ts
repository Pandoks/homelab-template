import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
  plugins: [sveltekit(), visualizer()],
  envDir: '../..',
  test: {
    passWithNoTests: true,
    reporters: process.env.GITHUB_ACTIONS ? ['github-actions'] : 'default',
    include: ['src/**/*.test.{js,ts}'],
    env: {
      MAIN_DB_URL: 'postgresql://user:password@localhost:5432/userdb',
      MAIN_REDIS_URL: 'redis://:password@localhost:6379',
      PUBLIC_DOMAIN: 'localhost',
      PUBLIC_APP_NAME: 'homelab-template'
    },
    fileParallelism: false
  }
});
