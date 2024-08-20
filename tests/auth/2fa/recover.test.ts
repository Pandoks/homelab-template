import { logout, test } from '../../utils';

test('should disable 2fa with recovery code', async ({ twoFacPass, twoFacKey }) => {
  await Promise.all([logout(twoFacPass.page), logout(twoFacKey.page)]);
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
