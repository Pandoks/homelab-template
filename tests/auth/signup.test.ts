import { emails, users } from '$lib/db/postgres/schema';
import { expect, test } from '@playwright/test';
import { and, eq } from 'drizzle-orm';
import { db } from '../db';
import dotenv from 'dotenv';
import { restoreDatabase } from '../utils';

const { parsed: env } = dotenv.config({ path: `.env.test` });
if (!env) throw new Error('Need .env.test');

test.describe('Partially signed up user', () => {
  test.beforeEach('restore database state', () => {
    restoreDatabase({
      username: env.USER_DB_USERNAME,
      database: env.USER_DB_DATABASE,
      host: env.USER_DB_HOST,
      port: env.USER_DB_PORT,
      dumpFile: 'playwright/.states/user-db.dump'
    });
  });
  test.use({ storageState: 'playwright/.states/password-partial-signup.json' });

  test('should delete user', async ({ page }) => {
    await page.goto('/auth/signup');
    const [partialPasswordLoginUser] = await db.main
      .select()
      .from(emails)
      .innerJoin(
        users,
        and(eq(users.id, emails.userId), eq(users.username, 'partial_password_user'))
      )
      .where(eq(emails.email, 'partial_password_user@example'))
      .limit(1);
    expect(partialPasswordLoginUser).toBeFalsy();
  });

  // test('should allow user to sign up with passkey', async ({ context, page }) => {
  //   await page.goto('/auth/signup');
  //
  //   // initialize automatic passkey verification
  //   const client = await context.newCDPSession(page);
  //
  //   await client.send('WebAuthn.enable');
  //   const result = await client.send('WebAuthn.addVirtualAuthenticator', {
  //     options: {
  //       protocol: 'ctap2',
  //       transport: 'usb',
  //       hasResidentKey: true,
  //       hasUserVerification: true,
  //       isUserVerified: true,
  //       automaticPresenceSimulation: true
  //     }
  //   });
  //   const authenticatorId = result.authenticatorId;
  //
  //   await page.getByLabel('Username').fill('test');
  //   await page.getByLabel('Email').fill(emailInput);
  //   await page.getByRole('button', { name: 'Passkey Sign Up' }).click();
  //   await page.getByRole('button', { name: 'Sign Up', exact: true }).click();
  //
  //   await page.waitForURL('/auth/email-verification');
  // });
});

test.describe('Fully signed up user', () => {});
