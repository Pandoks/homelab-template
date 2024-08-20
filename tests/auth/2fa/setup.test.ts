import { expect, type Page } from '@playwright/test';
import { test } from '../../utils';
import { base32, encodeHex } from 'oslo/encoding';
import { db } from '../../db';
import { twoFactorAuthenticationCredentials } from '$lib/db/postgres/schema/auth';
import { eq } from 'drizzle-orm';
import { TOTPController } from 'oslo/otp';
import { sha256 } from 'oslo/crypto';

const totpController = new TOTPController();
const setupPageTOTP = async (page: Page) => {
  await page.goto('/auth/2fa/setup');
  await page.locator('button[data-button-root]:has(svg.lucide-eye)').click();
  await page.locator('input[type="text"][disabled]').waitFor({ state: 'visible' });
  const plainTwoFactor = await page.locator('input[type="text"][disabled]').inputValue();
  expect(plainTwoFactor).toBeTruthy();

  const twoFactorSecret = base32.decode(plainTwoFactor);

  const twoFactorInfo = await db.main
    .select()
    .from(twoFactorAuthenticationCredentials)
    .where(eq(twoFactorAuthenticationCredentials.twoFactorSecret, encodeHex(twoFactorSecret)));
  expect(twoFactorInfo.length).toBe(1);
  expect(twoFactorInfo[0].activated).toBe(false);

  await page.getByPlaceholder('XXXXXX').click();
  await page.getByPlaceholder('XXXXXX').fill('wrongs');
  const badTotpCodeVerificationResponse = page.waitForResponse('/auth/2fa/setup?/verify-otp');
  await Promise.all([
    page.getByRole('button', { name: 'Verify' }).click(),
    badTotpCodeVerificationResponse
  ]);
  await expect(page.getByRole('button', { name: 'Continue' })).toBeDisabled();

  await page.getByPlaceholder('XXXXXX').click();
  await page.getByPlaceholder('XXXXXX').fill(await totpController.generate(twoFactorSecret));
  const totpCodeVerificationResponse = page.waitForResponse('/auth/2fa/setup?/verify-otp');
  await Promise.all([
    page.locator('form').getByRole('button').click(),
    totpCodeVerificationResponse
  ]);
  await expect(page.getByRole('button', { name: 'Continue' })).toBeEnabled();

  // if this fails, it's usually because the otp code got rejected (~0.2% failure rate)
  // unlucky timing of code creation towards end of lifecycle
  const recoveryCodeWait = page.waitForURL('/auth/2fa/setup/recovery');
  await Promise.all([page.getByRole('button', { name: 'Continue' }).click(), recoveryCodeWait]);
};

test.describe('logged in user', () => {
  // test('should not allow non email verified users', async ({ partPass, partKey }) => {
  //   const partPassSetupRedirect = partPass.page.waitForURL('/auth/email-verification');
  //   const partKeySetupRedirect = partKey.page.waitForURL('/auth/email-verification');
  //   await Promise.all([
  //     partPass.page.goto('/auth/2fa/setup'),
  //     partKey.page.goto('/auth/2fa/setup'),
  //     partPassSetupRedirect,
  //     partKeySetupRedirect
  //   ]);
  //
  //   const partPassRecoveryRedirect = partPass.page.waitForURL('/auth/email-verification');
  //   const partKeyRecoveryRedirect = partKey.page.waitForURL('/auth/email-verification');
  //   await Promise.all([
  //     partPass.page.goto('/auth/2fa/setup/recovery'),
  //     partKey.page.goto('/auth/2fa/setup/recovery'),
  //     partPassRecoveryRedirect,
  //     partKeyRecoveryRedirect
  //   ]);
  // });

  test('should allow 2fa setup', async ({ fullPass, fullKey }) => {
    await Promise.all([setupPageTOTP(fullPass.page), setupPageTOTP(fullKey.page)]);
    const checkRecovery = async (page: Page) => {
      await page.getByRole('button').nth(1).click();
      const plainRecoveryCode = await page.locator('input[type="text"][disabled]').inputValue();
      expect(plainRecoveryCode).toBeTruthy();

      const homeWait = page.waitForURL('/');
      await page.getByRole('button', { name: 'Activate 2 Factor' }).click();
      await Promise.all([
        await page.getByRole('button', { name: 'Activate', exact: true }).click(),
        homeWait
      ]);

      const twoFactorInfo = await db.main
        .select()
        .from(twoFactorAuthenticationCredentials)
        .where(
          eq(
            twoFactorAuthenticationCredentials.twoFactorRecoveryHash,
            encodeHex(await sha256(new TextEncoder().encode(plainRecoveryCode)))
          )
        );
      expect(twoFactorInfo.length).toBe(1);
      expect(twoFactorInfo[0].activated).toBe(true);
    };
    await Promise.all([checkRecovery(fullPass.page), checkRecovery(fullKey.page)]);
  });

  // test('should be able to generate a new recovery code', async ({ fullPass, fullKey }) => {
  //   await Promise.all([setupPageTOTP(fullPass.page), setupPageTOTP(fullKey.page)]);
  //   const changeRecovery = async (page: Page) => {
  //     await page.reload();
  //   };
  // });
});

// test('should not allow non logged in', async ({ page }) => {
//   const loginRedirect = page.waitForURL('/auth/login');
//   await Promise.all([page.goto('/auth/2fa/setup'), loginRedirect]);
//
//   const loginRedirectRecovery = page.waitForURL('/auth/login');
//   await Promise.all([page.goto('/auth/2fa/setup/recovery'), loginRedirectRecovery]);
// });
