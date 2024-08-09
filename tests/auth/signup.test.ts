import { emails, users } from '$lib/db/postgres/schema';
import { emailVerifications, sessions } from '$lib/db/postgres/schema/auth';
import { expect, test, type Page } from '@playwright/test';
import { and, eq } from 'drizzle-orm';
import { resetTestDatabases } from '../utils';
import { db } from '../db';

test.describe('Sign up', () => {
  const username = 'testuser';
  const emailInput = 'test@example.com';
  const emailCode = 'TEST';

  test.beforeAll(async () => {
    await resetTestDatabases();
  });

  test.afterEach(async () => {
    await resetTestDatabases();
  });

  const signup = async (page: Page) => {
    await page.goto('/auth/signup');

    await page.getByLabel('Username').fill(username);
    await page.getByLabel('Email').fill(emailInput);
    await page.locator('input[name="password"]').fill('=+s8W$5)Ww6$t@cS!hqkx');
    await page.getByRole('button', { name: 'Sign Up', exact: true }).click();

    await page.waitForURL('/auth/email-verification');
  };

  test('should allow a user to sign up', async ({ page }) => {
    await signup(page);
    const [result] = await db.main
      .select()
      .from(emails)
      .innerJoin(users, and(eq(users.id, emails.userId), eq(users.username, username)))
      .where(eq(emails.email, emailInput))
      .limit(1);
    expect(result).toBeTruthy();
    const user = result.users;
    const email = result.emails;
    expect(email.isVerified).toBeFalsy();

    const emailVerification = await db.main
      .select()
      .from(emailVerifications)
      .where(eq(emailVerifications.email, emailInput));
    expect(emailVerification.length).toBe(1);

    const session = await db.main.select().from(sessions).where(eq(sessions.userId, user.id));
    expect(session.length).toBe(1);

    await page.getByLabel('Verification Code').fill(emailCode);
    await page.getByRole('button', { name: 'Activate' }).click();

    await page.waitForURL('/');
    const afterEmailVerification = await db.main
      .select()
      .from(emailVerifications)
      .where(eq(emailVerifications.email, emailInput));
    expect(afterEmailVerification.length).toBe(0);

    const [verifiedResult] = await db.main
      .select()
      .from(emails)
      .where(eq(emails.email, emailInput))
      .limit(1);
    expect(verifiedResult).toBeTruthy();
    expect(verifiedResult.isVerified).toBeTruthy();
  });

  test('should delete user if email not verified', async ({ page }) => {
    await signup(page);
    const [result] = await db.main
      .select()
      .from(emails)
      .innerJoin(users, and(eq(users.id, emails.userId), eq(users.username, username)))
      .where(eq(emails.email, emailInput))
      .limit(1);
    expect(result).toBeTruthy();
    const email = result.emails;
    expect(email.isVerified).toBeFalsy();

    await page.goto('/auth/signup');
    const [result2] = await db.main
      .select()
      .from(emails)
      .innerJoin(users, and(eq(users.id, emails.userId), eq(users.username, username)))
      .where(eq(emails.email, emailInput))
      .limit(1);
    expect(result2).toBeFalsy();
  });

  test("shouldn't accept invalid inputs", async ({ page }) => {
    await page.goto('/auth/signup');

    await page.getByLabel('Username').fill('#$*(5)#@)');
    await expect(page.getByText('Special characters are not')).toBeVisible();
    await page.getByLabel('Email').fill(emailInput);
    await page.locator('input[name="password"]').fill('=+s8W$5)Ww6$t@cS!hqkx');
    await page.getByRole('button', { name: 'Sign Up', exact: true }).click();
  });
});
