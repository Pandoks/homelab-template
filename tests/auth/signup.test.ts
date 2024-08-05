import { test } from '@playwright/test';

test.describe('Sign up', () => {
  test('should allow a user to sign up', async ({ page }) => {
    await page.goto('/auth/signup');
  });
});
