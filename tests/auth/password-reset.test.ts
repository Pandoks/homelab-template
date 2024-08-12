// // import test from '@playwright/test';
// import dotenv from 'dotenv';
// import { restoreDatabase } from '../utils';
//
// const { parsed: env } = dotenv.config({ path: `.env.test` });
// if (!env) throw new Error('Need .env.test');
//
// test.beforeEach('restore database state', () => {
//   restoreDatabase({
//     username: env.USER_DB_USERNAME,
//     database: env.USER_DB_DATABASE,
//     host: env.USER_DB_HOST,
//     port: env.USER_DB_PORT,
//     dumpFile: 'playwright/.states/users-db.dump'
//   });
// });
//
// test.describe('Partially signed up password user', () => {
//   test.use({ storageState: 'playwright/.states/password-partial-signup.json' });
//
//   test('should redirect user', async ({ page }) => {
//     await page.goto('/auth/password-reset');
//     await page.waitForURL('/auth/email-verification');
//   });
// });
//
// test.describe('Fully signed up password user', () => {
//   test.use({ storageState: 'playwright/.states/password-full-signup.json' });
//
//   test('should redirect user', async ({ page }) => {
//     await page.goto('/auth/password-reset');
//     await page.waitForURL('/');
//   });
// });
//
// test.describe('Partially signed up password user', () => {
//   test.use({ storageState: 'playwright/.states/passkey-partial-signup.json' });
//
//   test('should redirect user', async ({ page }) => {
//     await page.goto('/auth/password-reset');
//     await page.waitForURL('/auth/email-verification');
//   });
// });
//
// test.describe('Fully signed up passkey user', () => {
//   test.use({ storageState: 'playwright/.states/passkey-full-signup.json' });
//
//   test('should redirect user', async ({ page }) => {
//     await page.goto('/auth/password-reset');
//     await page.waitForURL('/');
//   });
// });
