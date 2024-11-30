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
      USER_DB_USERNAME: 'user',
      USER_DB_PASSWORD: 'password',
      USER_DB_HOST: 'localhost',
      USER_DB_PORT: '5432',
      USER_DB_DATABASE: 'userdb',
      MAIN_REDIS_PASSWORD: 'password',
      MAIN_REDIS_HOST: 'localhost',
      MAIN_REDIS_PORT: '6379',
      PUBLIC_DOMAIN: 'localhost',
      PUBLIC_APP_NAME: 'homelab-template'
    },
    fileParallelism: false
  }
});
