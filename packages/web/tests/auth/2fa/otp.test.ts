import { logout, test } from '../../utils';

test('should allow user past when correct 2fa', async ({ twoFacPass }) => {
  const page = twoFacPass.page;
  await logout(page);

  await page.goto('/auth/login');
  await page.locator('input[name="usernameOrEmail"]').click();
  await page.locator('input[name="usernameOrEmail"]').fill(twoFacPass.username);
  await page.locator('input[name="password"]').click();
  await page.locator('input[name="password"]').fill(twoFacPass.password!);
  const otpWait = page.waitForURL('/auth/2fa/otp');
  await Promise.all([page.getByRole('button', { name: 'Login', exact: true }).click(), otpWait]);

  const totpController = new TOTPController();
  await page.getByPlaceholder('XXXXXX').click();
  await page
    .getByPlaceholder('XXXXXX')
    .fill(await totpController.generate(twoFacPass.twoFacSecret!));
  const waitHome = page.waitForURL('/');
  await Promise.all([page.locator('form').getByRole('button').click(), waitHome]);
});

test.describe('redirections based off of user conditions', () => {
  test('should skip verification if logging in with passkey', async ({ twoFacKey }) => {
    const page = twoFacKey.page;
    await logout(page);

    await page.goto('/auth/login');
    const passwordFormWait = page.locator('form[action="?/login"]').waitFor({ state: 'hidden' });
    const passkeyFormWait = page
      .locator('form[action="?/login-passkey"]')
      .waitFor({ state: 'visible' });
    await Promise.all([
      page.getByRole('button', { name: 'Passkey Login' }).click(),
      passwordFormWait,
      passkeyFormWait
    ]);

    await page.getByRole('textbox').click();
    await page.getByRole('textbox').fill(twoFacKey.username);

    const homeWait = page.waitForURL('/');
    await Promise.all([page.getByRole('button', { name: 'Login', exact: true }).click(), homeWait]);
  });

  test('should not allow non logged in', async ({ page }) => {
    const loginRedirect = page.waitForURL('/auth/login');
    await Promise.all([page.goto('/auth/2fa/otp'), loginRedirect]);
  });
});
