import { eq } from 'drizzle-orm';
import { db } from '../db';
import { createNewTestUser, generateRandomTestUser, test } from '../utils';
import { expect } from '@playwright/test';

test.describe('logging in user', () => {
  test('should reset with a verified and strong password with created token', async ({ page }) => {
    const { username, email, password } = await generateRandomTestUser('password-reset');
    await createNewTestUser({
      username: username,
      email: email,
      emailVerified: true
    });

    await page.goto('/auth/login');
    const passwordResetWait = page.waitForURL('/auth/password-reset');
    await Promise.all([
      page.getByRole('link', { name: 'Forgot your password?' }).click(),
      passwordResetWait
    ]);
    await page.getByLabel('Email').click();
    await page.getByLabel('Email').fill(email);
    const passwordResetResponse = page.waitForResponse('/auth/password-reset?/password-reset');
    await Promise.all([
      page.getByRole('button', { name: 'Submit' }).click(),
      passwordResetResponse
    ]);

    const [passwordResetToken] = await db.main
      .select()
      .from(users)
      .innerJoin(passwordResets, eq(users.id, passwordResets.userId))
      .where(eq(users.username, username.toLowerCase()));
    expect(passwordResetToken).toBeTruthy();

    await page.goto(`/auth/password-reset/${passwordResetToken.users.id}-test`);
    await Promise.all([
      expect(page.getByRole('heading', { name: 'New Password' })).toBeVisible(),
      expect(page.locator('form div').first()).toBeVisible(),
      expect(page.locator('form div').filter({ hasText: 'Confirm Password' })).toBeVisible()
    ]);

    // must confirm password
    await page.getByLabel('Password', { exact: true }).click();
    await page.getByLabel('Password', { exact: true }).fill(password);
    await page.getByLabel('Confirm Password').click();
    await page.getByLabel('Confirm Password').fill(`wrong-${password}`);
    await page.getByRole('button', { name: 'Submit' }).click();
    await expect(page.getByText('Passwords must match')).toBeVisible();

    // must be strong password
    await page.getByLabel('Password', { exact: true }).click();
    await page.getByLabel('Password', { exact: true }).fill('password');
    await page.getByLabel('Confirm Password').click();
    await page.getByLabel('Confirm Password').fill('password');
    const weakPasswordResponse = page.waitForResponse(
      `/auth/password-reset/${passwordResetToken.users.id}-test?/new-password`
    );
    await Promise.all([page.getByRole('button', { name: 'Submit' }).click(), weakPasswordResponse]);
    await expect(page.getByText('Weak password')).toBeVisible();

    await page.getByLabel('Password', { exact: true }).click();
    await page.getByLabel('Password', { exact: true }).fill(password);
    await page.getByLabel('Confirm Password').click();
    await page.getByLabel('Confirm Password').fill(password);
    const newPasswordResponse = page.waitForResponse(
      `/auth/password-reset/${passwordResetToken.users.id}-test?/new-password`
    );
    await Promise.all([page.getByRole('button', { name: 'Submit' }).click(), newPasswordResponse]);
    const [passwordReset] = await db.main
      .select()
      .from(users)
      .innerJoin(passwordResets, eq(passwordResets.userId, users.id))
      .where(eq(users.username, username.toLowerCase()));
    expect(passwordReset).toBeFalsy();

    await page.goto('/auth/login');
    await page.locator('input[name="usernameOrEmail"]').click();
    await page.locator('input[name="usernameOrEmail"]').fill(username);

    // invalid previous password
    await page.locator('input[name="password"]').click();
    await page.locator('input[name="password"]').fill('password');

    const wrongPasswordResponse = page.waitForResponse('/auth/login?/login');
    await Promise.all([
      page.getByRole('button', { name: 'Login', exact: true }).click(),
      wrongPasswordResponse
    ]);
    await expect(page.getByText('Invalid Credentials')).toBeVisible();

    await page.locator('input[name="password"]').click();
    await page.locator('input[name="password"]').fill(password);

    const homeWait = page.waitForURL('/');
    await Promise.all([page.getByRole('button', { name: 'Login', exact: true }).click(), homeWait]);
  });
  test('should not give information about wrong email credentials', async ({ page }) => {
    const { email } = await generateRandomTestUser('password-reset');

    const [emailInfo] = await db.main.select().from(emails).where(eq(emails.email, email));
    expect(emailInfo).toBeFalsy();

    await page.goto('/auth/login');
    const passwordResetWait = page.waitForURL('/auth/password-reset');
    await Promise.all([
      page.getByRole('link', { name: 'Forgot your password?' }).click(),
      passwordResetWait
    ]);
    await page.getByLabel('Email').click();
    await page.getByLabel('Email').fill(email);

    const passwordResetResponse = page.waitForResponse('/auth/password-reset?/password-reset');
    await Promise.all([
      page.getByRole('button', { name: 'Submit' }).click(),
      passwordResetResponse
    ]);

    await expect(page.getByText('Password reset instructions sent to email')).toBeVisible();
  });
  test('should not accept bad password reset tokens', async ({ page }) => {
    await page.goto('/auth/password-reset/badpasswordresettoken');
    await expect(page.getByText('Password reset link has expired')).toBeVisible();

    expect(await page.getByRole('button', { name: 'Submit' }).isDisabled()).toBeTruthy();
  });
});

test('should not allow already logged in', async ({ partPass, fullPass, partKey, fullKey }) => {
  const [partPassPage, fullPassPage, partKeyPage, fullKeyPage] = [
    partPass.page,
    fullPass.page,
    partKey.page,
    fullKey.page
  ];
  const waits = [
    partPassPage.waitForURL('/auth/email-verification'),
    fullPassPage.waitForURL('/'),
    partKeyPage.waitForURL('/auth/email-verification'),
    fullKeyPage.waitForURL('/')
  ];
  await Promise.all([
    partPassPage.goto('/auth/password-reset'),
    fullPassPage.goto('/auth/password-reset'),
    partKeyPage.goto('/auth/password-reset'),
    fullKeyPage.goto('/auth/password-reset'),
    ...waits
  ]);
});
