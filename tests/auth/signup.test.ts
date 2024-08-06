import { db } from '$lib/db/postgres';
import { users } from '$lib/db/postgres/schema';
import { emailVerifications, sessions } from '$lib/db/postgres/schema/auth';
import { resetTestDatabases } from '$lib/test/utils';
import { expect, test } from '@playwright/test';
import { and, eq } from 'drizzle-orm';

test.describe('Sign up', () => {
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
    const user = await db
      .test!.select()
      .from(users)
      .where(and(eq(users.username, 'testuser'), eq(users.email, 'test@example.com')));
    expect(user.length).toBe(1);
    expect(user[0].isEmailVerified).toBeFalsy();

    const emailVerification = await db
      .test!.select()
      .from(emailVerifications)
      .where(eq(emailVerifications.userId, user[0].id));
    expect(emailVerification.length).toBe(1);

    const session = await db.test!.select().from(sessions).where(eq(sessions.userId, user[0].id));
    expect(session.length).toBe(1);

    await page.getByLabel('Verification Code').fill('TEST');
    await page.getByRole('button', { name: 'Activate' }).click();

    await page.waitForURL('/');
    const afterEmailVerification = await db
      .test!.select()
      .from(emailVerifications)
      .where(eq(emailVerifications.userId, user[0].id));
    expect(afterEmailVerification.length).toBe(0);
    const verifiedUser = await db
      .test!.select()
      .from(users)
      .where(and(eq(users.username, 'testuser'), eq(users.email, 'test@example.com')));
    expect(verifiedUser.length).toBe(1);
    expect(verifiedUser[0].isEmailVerified).toBeTruthy();
  });
});
