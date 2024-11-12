import { eq } from 'drizzle-orm';
import { db } from '../../db';
import { logout, test } from '../../utils';
import { expect } from '@playwright/test';

test('should disable 2fa with recovery code', async ({ twoFacPass }) => {
  const page = twoFacPass.page;
  await logout(page);

  await page.goto('/auth/login');
  await page.locator('input[name="usernameOrEmail"]').click();
  await page.locator('input[name="usernameOrEmail"]').fill(twoFacPass.username);
  await page.locator('input[name="password"]').click();
  await page.locator('input[name="password"]').fill(twoFacPass.password!);
  const otpWait = page.waitForURL('/auth/2fa/otp');
  await Promise.all([page.getByRole('button', { name: 'Login', exact: true }).click(), otpWait]);
  const recoverWait = page.waitForURL('/auth/2fa/recover');
  await Promise.all([page.getByRole('link', { name: 'Recovery Code' }).click(), recoverWait]);
  await page.getByLabel('Recovery Code').click();
  await page.getByLabel('Recovery Code').fill(twoFacPass.twoFacRecovery!);
  await page.getByRole('button', { name: 'Recover' }).click();

  const homeWait = page.waitForURL('/');
  await Promise.all([
    page.getByLabel('2FA will be disabled').getByRole('button', { name: 'Recover' }).click(),
    homeWait
  ]);

  const twoFactorInfo = await db.main
    .select()
    .from(users)
    .innerJoin(
      twoFactorAuthenticationCredentials,
      eq(twoFactorAuthenticationCredentials.userId, users.id)
    )
    .where(eq(users.username, twoFacPass.username.toLowerCase()));
  expect(twoFactorInfo.length).toBe(0);

  // login without 2fa
  await logout(page);
  await page.goto('/auth/login');
  await page.locator('input[name="usernameOrEmail"]').click();
  await page.locator('input[name="usernameOrEmail"]').fill(twoFacPass.username);
  await page.locator('input[name="password"]').click();
  await page.locator('input[name="password"]').fill(twoFacPass.password!);
  const loginHomeWait = page.waitForURL('/');
  await Promise.all([
    page.getByRole('button', { name: 'Login', exact: true }).click(),
    loginHomeWait
  ]);
});

test.describe('redirections based off of user conditions', () => {
  test('should not allow non logged in', async ({ page }) => {
    const loginRedirect = page.waitForURL('/auth/login');
    await Promise.all([page.goto('/auth/2fa/recover'), loginRedirect]);
  });

  test('should not allow already verified', async ({ twoFacPass, twoFacKey }) => {
    const passHomeRedirect = twoFacPass.page.waitForURL('/');
    const keyHomeRedirect = twoFacKey.page.waitForURL('/');
    await Promise.all([
      twoFacPass.page.goto('/auth/2fa/recover'),
      twoFacKey.page.goto('/auth/2fa/recover'),
      passHomeRedirect,
      keyHomeRedirect
    ]);
  });

  test('should not allow non verified emails', async ({ partPass, partKey }) => {
    const passHomeRedirect = partPass.page.waitForURL('/auth/email-verification');
    const keyHomeRedirect = partKey.page.waitForURL('/auth/email-verification');
    await Promise.all([
      partPass.page.goto('/auth/2fa/recover'),
      partKey.page.goto('/auth/2fa/recover'),
      passHomeRedirect,
      keyHomeRedirect
    ]);
  });
});
