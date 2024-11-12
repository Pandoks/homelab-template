import { eq } from 'drizzle-orm';
import { db } from '../db';
import { test } from '../utils';
import { expect } from '@playwright/test';
import { emailVerifications } from '@startup-template/core/database/main/schema/auth.sql';
import { emails } from '@startup-template/core/database/main/schema/user.sql';

test.describe('logged in user', () => {
  test('should redirect if email is already verified', async ({ fullPass }) => {
    const homeRedirect = fullPass.page.waitForURL('/');
    await Promise.all([fullPass.page.goto('/auth/email-verification'), homeRedirect]);
  });

  test('should verify email with code', async ({ partPass }) => {
    await expect(partPass.page.getByLabel('Verification Code')).toBeVisible();
    await partPass.page.getByLabel('Verification Code').click();
    await partPass.page.getByLabel('Verification Code').fill('random');

    const emailVerificationInvalidResponse = partPass.page.waitForResponse(
      '/auth/email-verification?/verify-email-code'
    );
    await Promise.all([
      partPass.page.getByRole('button', { name: 'Activate' }).click(),
      emailVerificationInvalidResponse
    ]);
    await expect(partPass.page.getByText('Invalid code')).toBeVisible();

    const [emailVerification] = await db.main
      .select()
      .from(emailVerifications)
      .where(eq(emailVerifications.email, partPass.email.toLowerCase()));
    expect(emailVerification).toBeTruthy();
    await partPass.page.getByLabel('Verification Code').click();
    await partPass.page.getByLabel('Verification Code').fill(emailVerification.code);

    const homeRedirect = partPass.page.waitForURL('/');
    await Promise.all([
      partPass.page.getByRole('button', { name: 'Activate' }).click(),
      homeRedirect
    ]);

    const [emailInfo] = await db.main
      .select()
      .from(emails)
      .where(eq(emails.email, partPass.email.toLowerCase()));
    expect(emailInfo.isVerified).toBe(true);
  });

  test('should throttle user to resend verification code', async ({ partPass }) => {
    await expect(partPass.page.getByLabel('Verification Code')).toBeVisible();

    const oldEmailVerification = await db.main
      .select()
      .from(emailVerifications)
      .where(eq(emailVerifications.email, partPass.email.toLowerCase()));
    expect(oldEmailVerification.length).toBe(1);

    const resendEmailVerificationResponse = partPass.page.waitForResponse(
      '/auth/email-verification?/resend'
    );
    const resendButtonDetach = partPass.page
      .getByRole('button', { name: 'Resend' })
      .waitFor({ state: 'hidden' });
    await Promise.all([
      partPass.page.getByRole('button', { name: 'Resend' }).click(),
      resendEmailVerificationResponse,
      resendButtonDetach
    ]);
    const newEmailVerification = await db.main
      .select()
      .from(emailVerifications)
      .where(eq(emailVerifications.email, partPass.email.toLowerCase()));
    expect(newEmailVerification.length).toBe(1);
    expect(newEmailVerification[0].code).not.toBe(oldEmailVerification[0].code);
  });
});

test('should not allow non logged in', async ({ page }) => {
  const loginRedirect = page.waitForURL('/auth/login');
  await Promise.all([page.goto('/auth/email-verification'), loginRedirect]);
});
