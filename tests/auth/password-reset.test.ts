// import dotenv from 'dotenv';
// import { allLoggedInGoto, resetTestDatabases, restoreDatabase } from '../utils';
// import test from '@playwright/test';
//
// const { parsed: env } = dotenv.config({ path: `.env.test` });
// if (!env) throw new Error('Need .env.test');
//
// test.beforeAll('restore database state', async () => {
//   console.log('restoring database password-reset');
//   await resetTestDatabases();
//   restoreDatabase({
//     username: env.USER_DB_USERNAME,
//     database: env.USER_DB_DATABASE,
//     host: env.USER_DB_HOST,
//     port: env.USER_DB_PORT,
//     dumpFile: 'playwright/.states/users-db.dump'
//   });
// });
//
// test('already logged in', async ({ browser }) => {
//   const { partialPasswordPage, fullPasswordPage, partialPasskeyPage, fullPasskeyPage } =
//     await allLoggedInGoto({ browser, url: '/auth/password-reset' });
//   await Promise.all([
//     partialPasswordPage.waitForURL('/auth/email-verification'),
//     fullPasswordPage.waitForURL('/'),
//     partialPasskeyPage.waitForURL('/auth/email-verification'),
//     fullPasskeyPage.waitForURL('/')
//   ]);
// });
