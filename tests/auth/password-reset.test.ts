import { test } from '../utils';

test('already logged in', async ({ partPass, fullPass, partKey, fullKey }) => {
  const [partPassPage, fullPassPage, partKeyPage, fullKeyPage] = [
    partPass.page,
    fullPass.page,
    partKey.page,
    fullKey.page
  ];
  await Promise.all([
    partPassPage.goto('/auth/password-reset'),
    fullPassPage.goto('/auth/password-reset'),
    partKeyPage.goto('/auth/password-reset'),
    fullKeyPage.goto('/auth/password-reset')
  ]);
  await Promise.all([
    partPassPage.waitForURL('/auth/email-verification'),
    fullPassPage.waitForURL('/'),
    partKeyPage.waitForURL('/auth/email-verification'),
    fullKeyPage.waitForURL('/')
  ]);
});
