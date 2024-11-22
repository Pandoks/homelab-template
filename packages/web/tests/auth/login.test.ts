import { expect } from '@playwright/test';
import { generateRandomTestUser, logout, test } from '../utils';

test.describe('user logins', () => {
  test('should allow email password login', async ({ fullPass }) => {
    const page = fullPass.page;
    await logout(page);

    await page.goto('/auth/login');
    await page.locator('input[name="usernameOrEmail"]').click();
    await page.locator('input[name="usernameOrEmail"]').fill(fullPass.email);
    await page.locator('input[name="password"]').click();
    await page.locator('input[name="password"]').fill(fullPass.password!);
    const homeWait = page.waitForURL('/');
    await Promise.all([page.getByRole('button', { name: 'Login', exact: true }).click(), homeWait]);
  });

  test('should allow username password login', async ({ fullPass }) => {
    const page = fullPass.page;
    await logout(page);

    await page.goto('/auth/login');
    await page.locator('input[name="usernameOrEmail"]').click();
    await page.locator('input[name="usernameOrEmail"]').fill(fullPass.username);
    await page.locator('input[name="password"]').click();
    await page.locator('input[name="password"]').fill(fullPass.password!);
    const homeWait = page.waitForURL('/');
    await Promise.all([page.getByRole('button', { name: 'Login', exact: true }).click(), homeWait]);
  });

  test('should allow email passkey login', async ({ fullKey }) => {
    const page = fullKey.page;
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
    await page.getByRole('textbox').fill(fullKey.email);

    const homeWait = page.waitForURL('/');
    await Promise.all([page.getByRole('button', { name: 'Login', exact: true }).click(), homeWait]);
  });

  test('should allow username passkey login', async ({ fullKey }) => {
    const page = fullKey.page;
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
    await page.getByRole('textbox').fill(fullKey.username);

    const homeWait = page.waitForURL('/');
    await Promise.all([page.getByRole('button', { name: 'Login', exact: true }).click(), homeWait]);
  });

  test('should not give information about bad username, email, or password', async ({
    fullPass
  }) => {
    const page = fullPass.page;
    await logout(page);

    await page.goto('/auth/login');
    const { username, email, password } = await generateRandomTestUser('login_test_user');
    await page.locator('input[name="usernameOrEmail"]').click();
    await page.locator('input[name="usernameOrEmail"]').fill(username);
    await page.locator('input[name="password"]').click();
    await page.locator('input[name="password"]').fill(password);
    const usernameLoginResponse = page.waitForResponse('/auth/login?/login');
    await Promise.all([
      page.getByRole('button', { name: 'Login', exact: true }).click(),
      usernameLoginResponse
    ]);
    await expect(page.getByText('Invalid Credentials')).toBeVisible();

    await page.locator('input[name="usernameOrEmail"]').click();
    await page.locator('input[name="usernameOrEmail"]').fill(email);
    await expect(page.getByText('Invalid Credentials')).toBeHidden();
    const emailLoginResponse = page.waitForResponse('/auth/login?/login');
    await Promise.all([
      page.getByRole('button', { name: 'Login', exact: true }).click(),
      emailLoginResponse
    ]);
    await expect(page.getByText('Invalid Credentials')).toBeVisible();
  });
});

test('should not allow already logged in', async ({ fullPass, fullKey }) => {
  const passHomeWait = fullPass.page.waitForURL('/');
  const keyHomeWait = fullKey.page.waitForURL('/');
  await Promise.all([
    fullPass.page.goto('/auth/login'),
    fullKey.page.goto('/auth/login'),
    passHomeWait,
    keyHomeWait
  ]);
});
