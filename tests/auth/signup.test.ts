import { emails, users } from '$lib/db/postgres/schema';
import { expect, test } from '@playwright/test';
import { and, eq } from 'drizzle-orm';
import { db } from '../db';
import dotenv from 'dotenv';
import { restoreDatabase } from '../utils';

const { parsed: env } = dotenv.config({ path: `.env.test` });
if (!env) throw new Error('Need .env.test');

test.beforeEach('restore database state', () => {
  restoreDatabase({
    username: env.USER_DB_USERNAME,
    database: env.USER_DB_DATABASE,
    host: env.USER_DB_HOST,
    port: env.USER_DB_PORT,
    dumpFile: 'playwright/.states/user-db.dump'
  });
});

test.describe('Partially signed up password user', () => {
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
      .where(eq(emails.email, 'partial_password_user@example.com'))
      .limit(1);
    expect(partialPasswordLoginUser).toBeFalsy();
  });
});

test.describe('Fully signed up password user', () => {
  test.use({ storageState: 'playwright/.states/password-full-signup.json' });

  test('should redirect user', async ({ page }) => {
    await page.goto('/auth/signup');
    await page.waitForURL('/');

    const [fullPasswordUser] = await db.main
      .select()
      .from(emails)
      .innerJoin(users, and(eq(users.id, emails.userId), eq(users.username, 'full_password_user')))
      .where(eq(emails.email, 'full_password_user@example.com'))
      .limit(1);
    expect(fullPasswordUser).toBeTruthy();
  });
});

test.describe('Partially signed up passkey user', () => {
  test.use({ storageState: 'playwright/.states/passkey-partial-signup.json' });

  test('should delete user', async ({ page }) => {
    await page.goto('/auth/signup');
    const [partialPasswordLoginUser] = await db.main
      .select()
      .from(emails)
      .innerJoin(
        users,
        and(eq(users.id, emails.userId), eq(users.username, 'partial_passkey_user'))
      )
      .where(eq(emails.email, 'partial_passkey_user@example.com'))
      .limit(1);
    expect(partialPasswordLoginUser).toBeFalsy();
  });
});

test.describe('Fully signed up passkey user', () => {
  test.use({ storageState: 'playwright/.states/passkey-full-signup.json' });

  test('should redirect user', async ({ page }) => {
    await page.goto('/auth/signup');
    await page.waitForURL('/');

    const [fullPasswordUser] = await db.main
      .select()
      .from(emails)
      .innerJoin(users, and(eq(users.id, emails.userId), eq(users.username, 'full_passkey_user')))
      .where(eq(emails.email, 'full_passkey_user@example.com'))
      .limit(1);
    expect(fullPasswordUser).toBeTruthy();
  });
});
