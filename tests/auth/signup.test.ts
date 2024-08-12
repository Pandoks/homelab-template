import { users } from '$lib/db/postgres/schema';
import { expect, test } from '@playwright/test';
import { eq, or } from 'drizzle-orm';
import { db } from '../db';
import dotenv from 'dotenv';
import { restoreDatabase } from '../utils';

const { parsed: env } = dotenv.config({ path: `.env.test` });
if (!env) throw new Error('Need .env.test');

test.describe.configure({ mode: 'serial' });

test.beforeAll('restore database state', () => {
  restoreDatabase({
    username: env.USER_DB_USERNAME,
    database: env.USER_DB_DATABASE,
    host: env.USER_DB_HOST,
    port: env.USER_DB_PORT,
    dumpFile: 'playwright/.states/users-db.dump'
  });
});

test('already signed up', async ({ browser }) => {
  const [partialPasswordContext, fullPasswordContext, partialPasskeyContext, fullPasskeyContext] =
    await Promise.all([
      browser.newContext({
        storageState: 'playwright/.states/password-partial-signup.json'
      }),
      browser.newContext({
        storageState: 'playwright/.states/password-full-signup.json'
      }),
      browser.newContext({
        storageState: 'playwright/.states/passkey-partial-signup.json'
      }),
      browser.newContext({
        storageState: 'playwright/.states/passkey-full-signup.json'
      })
    ]);
  const [partialPasswordPage, fullPasswordPage, partialPasskeyPage, fullPasskeyPage] =
    await Promise.all([
      partialPasswordContext.newPage(),
      fullPasswordContext.newPage(),
      partialPasskeyContext.newPage(),
      fullPasskeyContext.newPage()
    ]);
  await Promise.all([
    partialPasswordPage.goto('/auth/signup'),
    fullPasswordPage.goto('/auth/signup'),
    partialPasskeyPage.goto('/auth/signup'),
    fullPasskeyPage.goto('/auth/signup')
  ]);
  await Promise.all([fullPasswordPage.waitForURL('/'), fullPasskeyPage.waitForURL('/')]);

  const deletedUsers = await db.main
    .select()
    .from(users)
    .where(
      or(eq(users.username, 'partial_password_user'), eq(users.username, 'partial_passkey_user'))
    );
  expect(deletedUsers.length).toBe(0);

  const noChangedUsers = await db.main
    .select()
    .from(users)
    .where(or(eq(users.username, 'full_password_user'), eq(users.username, 'full_passkey_user')));
  expect(noChangedUsers.length).toBe(2);
});

test.describe('new user', () => {
  test.beforeAll('restore database state', () => {
    restoreDatabase({
      username: env.USER_DB_USERNAME,
      database: env.USER_DB_DATABASE,
      host: env.USER_DB_HOST,
      port: env.USER_DB_PORT,
      dumpFile: 'playwright/.states/users-db.dump'
    });
  });

  test('should not allow duplicate credentials', async ({ page }) => {
    const username = 'partial_password_user';
    const email = 'partial_password_user@example.com';
    await page.goto('/auth/signup');

    await page.getByLabel('Username').click();
    await page.getByLabel('Username').fill(username);
    await page.getByLabel('Email').click();
    await page.getByLabel('Email').fill(email);
    await page.locator('input[name="password"]').click();
    await page.locator('input[name="password"]').fill('=+s8W$5)Ww6$t@cS!hqkx');
    await page.getByRole('button', { name: 'Sign Up', exact: true }).click();

    await page.waitForResponse('/auth/signup?/signup');
    await expect(page.locator('form').getByText('Username already exists')).toBeVisible();

    await page.getByLabel('Username').click();
    await page.getByLabel('Username').fill(`${username}1`);
    await page.getByRole('button', { name: 'Sign Up', exact: true }).click();
    await page.waitForResponse('/auth/signup?/signup');
    await expect(page.locator('form').getByText('Email already exists')).toBeVisible();
  });

  test('should not allow weak passwords', async ({ page }) => {
    const username = 'beta_password';
    const email = 'beta_password@example.com';
    const password = 'password';
    await page.goto('/auth/signup');

    await page.getByLabel('Username').click();
    await page.getByLabel('Username').fill(username);
    await page.getByLabel('Email').click();
    await page.getByLabel('Email').fill(email);
    await page.locator('input[name="password"]').click();
    await page.locator('input[name="password"]').fill(password);
    await page.getByRole('button', { name: 'Sign Up', exact: true }).click();

    await page.waitForResponse('/auth/signup?/signup');
    await expect(page.locator('form').getByText('Weak password')).toBeVisible();

    const [badUser] = await db.main.select().from(users).where(eq(users.username, username));
    expect(badUser).toBeFalsy();
  });

  test('should share data between password and passkey', async ({ page }) => {
    const username = 'data_share';
    const email = 'data_share';
    await page.goto('/auth/signup');

    await page.getByLabel('Username').click();
    await page.getByLabel('Username').fill(username);
    await page.getByLabel('Email').click();
    await page.getByLabel('Email').fill(email);
    await page.getByRole('button', { name: 'Passkey Sign Up' }).click();

    await expect(page.getByLabel('Username')).toHaveValue(username);
    await expect(page.getByLabel('Email')).toHaveValue(email);

    await page.getByRole('button', { name: 'Password Sign Up' }).click();
    await expect(page.getByLabel('Username')).toHaveValue(username);
    await expect(page.getByLabel('Email')).toHaveValue(email);

    const [badUser] = await db.main.select().from(users).where(eq(users.username, username));
    expect(badUser).toBeFalsy();
  });
});
