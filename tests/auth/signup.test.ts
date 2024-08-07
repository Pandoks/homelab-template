import { db } from '$lib/db/postgres';
import { emails, users } from '$lib/db/postgres/schema';
import { emailVerifications, sessions } from '$lib/db/postgres/schema/auth';
import { resetTestDatabases } from '$lib/test/utils';
import { expect, test } from '@playwright/test';
import { and, eq } from 'drizzle-orm';

test.describe('Sign up', () => {
  test.beforeAll(async () => {
    resetTestDatabases();
  });

  test.afterEach(async () => {
    resetTestDatabases();
  });

  test('should allow a user to sign up', async ({ page }) => {
    await page.goto('/auth/signup');

    await page.getByLabel('Username').fill('testuser');
    await page.getByLabel('Email').fill('test@example.com');
    await page.locator('input[name="password"]').fill('=+s8W$5)Ww6$t@cS!hqkx');
    await page.getByRole('button', { name: 'Sign Up', exact: true }).click();

    await page.waitForURL('/auth/email-verification');
    const [result] = await db
      .test!.select()
      .from(emails)
      .innerJoin(users, and(eq(users.id, emails.userId), eq(users.username, 'testuser')))
      .where(eq(emails.email, 'test@example.com'))
      .limit(1);
    expect(result).toBeTruthy();
    const user = result.users;
    const email = result.emails;
    expect(email.isVerified).toBeFalsy();

    const emailVerification = await db
      .test!.select()
      .from(emailVerifications)
      .where(eq(emailVerifications.userId, user.id));
    expect(emailVerification.length).toBe(1);

    const session = await db.test!.select().from(sessions).where(eq(sessions.userId, user.id));
    expect(session.length).toBe(1);

    await page.getByLabel('Verification Code').fill('TEST');
    await page.getByRole('button', { name: 'Activate' }).click();

    await page.waitForURL('/');
    const afterEmailVerification = await db
      .test!.select()
      .from(emailVerifications)
      .where(eq(emailVerifications.userId, user.id));
    expect(afterEmailVerification.length).toBe(0);
    const [verifiedEmail] = await db
      .test!.select()
      .from(emails)
      .where(and(eq(emails.email, 'test@example.com'), eq(emails.userId, 'testuser')))
      .limit(1);
    expect(verifiedEmail).toBeTruthy();
    expect(email.isVerified).toBeTruthy();
  });
});
