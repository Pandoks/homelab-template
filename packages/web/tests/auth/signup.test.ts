import { expect } from '@playwright/test';
import { and, eq, or } from 'drizzle-orm';
import { db } from '../db';
import { createNewTestUser, generateRandomTestUser, test } from '../utils';

test.describe('new user', () => {
  test('should not allow duplicate credentials', async ({ page }) => {
    const [
      { username: unverifiedUsername, email: unverifiedEmail, password: unverifiedPassword },
      { username: verifiedUsername, email: verifiedEmail }
    ] = await Promise.all([
      generateRandomTestUser('signup_new_user'),
      generateRandomTestUser('signup_new_user')
    ]);
    await Promise.all([
      createNewTestUser({
        username: unverifiedUsername,
        email: unverifiedEmail,
        emailVerified: false
      }),
      createNewTestUser({
        username: verifiedUsername,
        email: verifiedEmail,
        emailVerified: true
      })
    ]);
    await page.goto('/auth/signup');

    await page.getByLabel('Username').click();
    await page.getByLabel('Username').fill(unverifiedUsername);
    await page.getByLabel('Email').click();
    await page.getByLabel('Email').fill(unverifiedEmail);
    await page.locator('input[name="password"]').click();
    await page.locator('input[name="password"]').fill(unverifiedPassword);
    const signupResponseWait = page.waitForResponse('/auth/signup?/signup');
    await Promise.all([
      page.getByRole('button', { name: 'Sign Up', exact: true }).click(),
      signupResponseWait
    ]);

    await expect(page.locator('form').getByText('Username already exists')).toBeVisible();

    await page.getByLabel('Username').click();
    await page.getByLabel('Username').fill(verifiedUsername.toUpperCase());
    await page.getByLabel('Email').click();
    await page.getByLabel('Email').fill(verifiedEmail);
    await page.locator('input[name="password"]').click();
    await page.locator('input[name="password"]').fill(unverifiedEmail);
    const signupResponseWait2 = page.waitForResponse('/auth/signup?/signup');
    await Promise.all([
      page.getByRole('button', { name: 'Sign Up', exact: true }).click(),
      signupResponseWait2
    ]);

    await expect(page.locator('form').getByText('Username already exists')).toBeVisible();

    await page.getByLabel('Username').click();
    await page.getByLabel('Username').fill(`${unverifiedUsername}1`);
    const signupResponseWait3 = page.waitForResponse('/auth/signup?/signup');

    await Promise.all([
      page.getByRole('button', { name: 'Sign Up', exact: true }).click(),
      signupResponseWait3
    ]);

    await expect(page.locator('form').getByText('Email already exists')).toBeVisible();
  });

  test('should not allow weak passwords', async ({ page }) => {
    const { username, email } = await generateRandomTestUser('signup_new_user');
    await page.goto('/auth/signup');

    await page.getByLabel('Username').click();
    await page.getByLabel('Username').fill(username);
    await page.getByLabel('Email').click();
    await page.getByLabel('Email').fill(email);
    await page.locator('input[name="password"]').click();
    await page.locator('input[name="password"]').fill('password');
    const signupResponseWait = page.waitForResponse('/auth/signup?/signup');
    await Promise.all([
      page.getByRole('button', { name: 'Sign Up', exact: true }).click(),
      signupResponseWait
    ]);

    await expect(page.locator('form').getByText('Weak password')).toBeVisible();

    const [badUser] = await db.main
      .select()
      .from(users)
      .where(eq(users.username, username.toLowerCase()));
    expect(badUser).toBeFalsy();
  });

  test('should share data between password and passkey', async ({ page }) => {
    const username = 'data_share';
    const email = 'data_share';
    await page.goto('/auth/signup');

    await page.getByLabel('Username').click();
    await page.getByLabel('Username').fill(username);
    await page.getByLabel('Email').click();
    await page.getByLabel('Email').fill(email);
    const passwordFormWait = page.locator('form[action="?/signup"]').waitFor({ state: 'hidden' });
    const passkeyFormWait = page
      .locator('form[action="?/signup-passkey"]')
      .waitFor({ state: 'visible' });
    await Promise.all([
      page.getByRole('button', { name: 'Passkey Sign Up' }).click(),
      passwordFormWait,
      passkeyFormWait
    ]);

    await Promise.all([
      expect(page.getByLabel('Username')).toHaveValue(username),
      expect(page.getByLabel('Email')).toHaveValue(email)
    ]);

    await page.getByRole('button', { name: 'Password Sign Up' }).click();
    await Promise.all([
      expect(page.getByLabel('Username')).toHaveValue(username),
      expect(page.getByLabel('Email')).toHaveValue(email)
    ]);

    const [badUser] = await db.main
      .select()
      .from(users)
      .where(eq(users.username, username.toLowerCase()));
    expect(badUser).toBeFalsy();
  });

  test('full password signup', async ({ page }) => {
    const { username, email, password } = await generateRandomTestUser('full_password');

    await page.goto('/auth/signup');

    await page.getByLabel('Username').click();
    await page.getByLabel('Username').fill(username);
    await page.getByLabel('Email').click();
    await page.getByLabel('Email').fill(email);
    await page.locator('input[name="password"]').click();
    await page.locator('input[name="password"]').fill(password);
    const emailVerificationWait = page.waitForURL('/auth/email-verification');
    await Promise.all([
      page.getByRole('button', { name: 'Sign Up', exact: true }).click(),
      emailVerificationWait
    ]);

    const [newUser] = await db.main
      .select()
      .from(users)
      .innerJoin(emails, and(eq(users.id, emails.userId)))
      .innerJoin(emailVerifications, eq(emailVerifications.email, emails.email))
      .innerJoin(sessions, eq(sessions.userId, users.id))
      .where(eq(users.username, username.toLowerCase()))
      .limit(1);
    expect(newUser).toBeTruthy();
    expect(newUser.emails.isVerified).toBeFalsy();
    expect(newUser.email_verifications).toBeTruthy();
    expect(newUser.sessions).toBeTruthy();

    await page.getByLabel('Verification Code').click();
    await page.getByLabel('Verification Code').fill(newUser.email_verifications.code);
    const homeWait = page.waitForURL('/');
    await Promise.all([page.getByRole('button', { name: 'Activate' }).click(), homeWait]);

    const [verifiedUser] = await db.main
      .select()
      .from(emails)
      .leftJoin(emailVerifications, eq(emailVerifications.email, emails.email))
      .where(eq(emails.email, email.toLowerCase()))
      .limit(1);
    expect(verifiedUser).toBeTruthy();
    expect(verifiedUser.emails.isVerified).toBeTruthy();
    expect(verifiedUser.email_verifications).toBeFalsy();
  });

  test('full passkey signup', async ({ page }) => {
    const { username, email } = await generateRandomTestUser('full_passkey');

    const client = await page.context().newCDPSession(page);
    await client.send('WebAuthn.enable');
    const { authenticatorId } = await client.send('WebAuthn.addVirtualAuthenticator', {
      options: {
        protocol: 'ctap2',
        transport: 'usb',
        hasResidentKey: true,
        hasUserVerification: true,
        isUserVerified: true,
        automaticPresenceSimulation: true
      }
    });

    await page.goto('/auth/signup');

    const passwordFormWait = page.locator('form[action="?/signup"]').waitFor({ state: 'hidden' });
    const passkeyFormWait = page
      .locator('form[action="?/signup-passkey"]')
      .waitFor({ state: 'visible' });
    await Promise.all([
      page.getByRole('button', { name: 'Passkey Sign Up' }).click(),
      passwordFormWait,
      passkeyFormWait
    ]);
    await page.getByLabel('Username').click();
    await page.getByLabel('Username').fill(username);
    await page.getByLabel('Email').click();
    await page.getByLabel('Email').fill(email);
    const signupResponseWait = page.waitForResponse('/auth/signup?/signup-passkey');
    const emailVerificationWait = page.waitForURL('/auth/email-verification');
    await Promise.all([
      page.getByRole('button', { name: 'Sign Up', exact: true }).click(),
      signupResponseWait,
      emailVerificationWait
    ]);

    const passkey = await client.send('WebAuthn.getCredentials', {
      authenticatorId
    });
    expect(passkey.credentials).toHaveLength(1);

    const [newUser] = await db.main
      .select()
      .from(users)
      .innerJoin(emails, and(eq(users.id, emails.userId)))
      .innerJoin(emailVerifications, eq(emailVerifications.email, emails.email))
      .innerJoin(sessions, eq(sessions.userId, users.id))
      .innerJoin(passkeys, eq(passkeys.userId, users.id))
      .where(eq(users.username, username.toLowerCase()))
      .limit(1);
    expect(newUser).toBeTruthy();
    expect(newUser.emails.isVerified).toBeFalsy();
    expect(newUser.email_verifications).toBeTruthy();
    expect(newUser.sessions).toBeTruthy();

    await page.getByLabel('Verification Code').click();
    await page.getByLabel('Verification Code').fill(newUser.email_verifications.code);
    const homeWait = page.waitForURL('/');
    await Promise.all([page.getByRole('button', { name: 'Activate' }).click(), homeWait]);

    const [verifiedUser] = await db.main
      .select()
      .from(emails)
      .leftJoin(emailVerifications, eq(emailVerifications.email, emails.email))
      .where(eq(emails.email, email.toLowerCase()))
      .limit(1);
    expect(verifiedUser).toBeTruthy();
    expect(verifiedUser.emails.isVerified).toBeTruthy();
    expect(verifiedUser.email_verifications).toBeFalsy();
  });
});

test('should not allow already logged in', async ({ partPass, fullPass, partKey, fullKey }) => {
  const [partPassPage, fullPassPage, partKeyPage, fullKeyPage] = [
    partPass.page,
    fullPass.page,
    partKey.page,
    fullKey.page
  ];
  const waits = [fullPassPage.waitForURL('/'), fullKeyPage.waitForURL('/')];
  await Promise.all([
    partPassPage.goto('/auth/signup'),
    fullPassPage.goto('/auth/signup'),
    partKeyPage.goto('/auth/signup'),
    fullKeyPage.goto('/auth/signup'),
    ...waits
  ]);

  const deletedUsers = await db.main
    .select()
    .from(users)
    .where(
      or(
        eq(users.username, partPass.username.toLowerCase()),
        eq(users.username, partKey.username.toLowerCase())
      )
    );
  expect(deletedUsers.length).toBe(0);

  const noChangedUsers = await db.main
    .select()
    .from(users)
    .where(
      or(
        eq(users.username, fullPass.username.toLowerCase()),
        eq(users.username, fullKey.username.toLowerCase())
      )
    );
  expect(noChangedUsers.length).toBe(2);
});
