import { mainDb } from './db';
import { eq, sql } from 'drizzle-orm';
import { type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type { RedisClientType } from 'redis';
import { hash } from '@node-rs/argon2';
import { test as testBase, type Page } from '@playwright/test';
import { emails, users } from '@startup-template/core/database/main/schema/user.sql';
import { generateRandomString } from '@oslojs/crypto/random';
import { alphabet } from '@startup-template/core/util/index';
import { decodeBase32, encodeBase32LowerCaseNoPadding } from '@oslojs/encoding';
import { emailVerifications } from '@startup-template/core/database/main/schema/auth.sql';
import { generateTOTP } from '@oslojs/otp';

export const resetTestDatabases = async ({
  redis,
  db
}: {
  redis: RedisClientType[];
  db: PostgresJsDatabase[];
}) => {
  let cemetary: Promise<any>[] = [];

  for (const redisClient of redis) {
    cemetary.push(redisClient.flushAll());
  }

  for (const dbInstance of db) {
    const tables: { table_name: string }[] =
      (await dbInstance.execute(sql`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
      `)) || [];
    for (const table of tables) {
      cemetary.push(dbInstance!.execute(sql.raw(`TRUNCATE TABLE ${table.table_name} CASCADE`)));
    }
  }

  await Promise.all(cemetary);
};

// Literally the password hash for 'password' lol
const PASSWORD_HASH = await hash('password', {
  // recommended minimum parameters
  memoryCost: 19456,
  timeCost: 2,
  outputLen: 32,
  parallelism: 1
});

// Inserts a new user into the test database based off of given credentials
export const createNewTestUser = async ({
  username,
  email,
  emailVerified
}: {
  username: string;
  email: string;
  emailVerified: boolean;
}) => {
  await mainDb.transaction(async (tsx) => {
    await tsx.insert(users).values({
      id: username,
      username: username.toLowerCase(),
      passwordHash: PASSWORD_HASH
    });
    await tsx.insert(emails).values({
      email: email.toLowerCase(),
      isVerified: emailVerified,
      userId: username
    });
  });
};

/** Generates the credentials for a random test user (remember to lowercase username and email for db queries) */
export const generateRandomTestUser = async (prefix: string) => {
  const createUsername = async () => {
    let username = `${prefix}_${generateRandomString(
      {
        read(bytes) {
          crypto.getRandomValues(bytes);
        }
      },
      alphabet({ options: ['0-9', 'a-z', 'A-Z'] }),
      6
    )}`;
    const [existingUser] = await mainDb.select().from(users).where(eq(users.username, username));
    if (existingUser) {
      username = await createUsername();
    }
    return username;
  };

  const username = await createUsername();

  return {
    username,
    email: `${username}@example.com`,
    password: encodeBase32LowerCaseNoPadding(crypto.getRandomValues(new Uint8Array(25))) // 40 characters
  };
};

export type AuthTest = {
  page: Page;
  username: string;
  email: string;
  password?: string;
  authenticatorId?: string;
  twoFacKey?: Uint8Array;
  twoFacRecovery?: string;
};
export type AuthFixture = {
  partPass: AuthTest;
  fullPass: AuthTest;
  twoFacPass: AuthTest;
  partKey: AuthTest;
  fullKey: AuthTest;
  twoFacKey: AuthTest;
};
export const test = testBase.extend<AuthFixture>({
  partPass: async ({ browser }, use) => {
    const { username, email, password } = await generateRandomTestUser('partial_password');
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto('/auth/signup');
    await page.getByLabel('Username').click();
    await page.getByLabel('Username').fill(username);
    await page.getByLabel('Email').click();
    await page.getByLabel('Email').fill(email);
    await page.locator('input[name="password"]').click();
    await page.locator('input[name="password"]').fill(password);

    const emailVerifyWait = page.waitForURL('/auth/email-verification');
    await Promise.all([
      page.getByRole('button', { name: 'Sign Up', exact: true }).click(),
      emailVerifyWait
    ]);

    await use({ page, username, email, password });
  },
  fullPass: async ({ browser }, use) => {
    const { username, email, password } = await generateRandomTestUser('full_password');
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto('/auth/signup');
    await page.getByLabel('Username').click();
    await page.getByLabel('Username').fill(username);
    await page.getByLabel('Email').click();
    await page.getByLabel('Email').fill(email);
    await page.locator('input[name="password"]').click();
    await page.locator('input[name="password"]').fill(password);

    const emailVerifyWait = page.waitForURL('/auth/email-verification');
    await Promise.all([
      page.getByRole('button', { name: 'Sign Up', exact: true }).click(),
      emailVerifyWait
    ]);

    const [emailVerification] = await mainDb
      .select()
      .from(emailVerifications)
      .where(eq(emailVerifications.email, email.toLowerCase()));
    await page.getByLabel('Verification Code').click();
    await page.getByLabel('Verification Code').fill(emailVerification.code);
    const homeWait = page.waitForURL('/');
    await Promise.all([page.getByRole('button', { name: 'Activate' }).click(), homeWait]);
    await use({ page, username, email, password });
  },
  twoFacPass: async ({ browser }, use) => {
    const { username, email, password } = await generateRandomTestUser('two_factor_full_password');
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto('/auth/signup');
    await page.getByLabel('Username').click();
    await page.getByLabel('Username').fill(username);
    await page.getByLabel('Email').click();
    await page.getByLabel('Email').fill(email);
    await page.locator('input[name="password"]').click();
    await page.locator('input[name="password"]').fill(password);

    const emailVerifyWait = page.waitForURL('/auth/email-verification');
    await Promise.all([
      page.getByRole('button', { name: 'Sign Up', exact: true }).click(),
      emailVerifyWait
    ]);

    const [emailVerification] = await mainDb
      .select()
      .from(emailVerifications)
      .where(eq(emailVerifications.email, email.toLowerCase()));
    await page.getByLabel('Verification Code').click();
    await page.getByLabel('Verification Code').fill(emailVerification.code);
    const homeWait = page.waitForURL('/');
    await Promise.all([page.getByRole('button', { name: 'Activate' }).click(), homeWait]);

    await page.goto('/auth/2fa/setup');
    await page.locator('button[data-button-root]:has(svg.lucide-eye)').click();
    await page.locator('input[type="text"][disabled]').waitFor({ state: 'visible' });
    const plainTwoFactor = await page.locator('input[type="text"][disabled]').inputValue();

    const twoFactorKey = decodeBase32(plainTwoFactor);

    await page.getByPlaceholder('XXXXXX').click();
    await page.getByPlaceholder('XXXXXX').fill(generateTOTP(twoFactorKey, 30, 6));
    const totpCodeVerificationResponse = page.waitForResponse('/auth/2fa/setup?/verify-otp');
    await Promise.all([
      page.locator('form').getByRole('button').click(),
      totpCodeVerificationResponse
    ]);

    // if this fails, it's usually because the otp code got rejected (~0.2% failure rate)
    // unlucky timing of code creation towards end of lifecycle
    const recoveryCodeWait = page.waitForURL('/auth/2fa/setup/recovery');
    await Promise.all([page.getByRole('button', { name: 'Continue' }).click(), recoveryCodeWait]);
    await page.getByRole('button').nth(1).click();
    const plainRecoveryCode = await page.locator('input[type="text"][disabled]').inputValue();

    const twoFacHomeWait = page.waitForURL('/');
    await page.getByRole('button', { name: 'Activate 2 Factor' }).click();
    await Promise.all([
      await page.getByRole('button', { name: 'Activate', exact: true }).click(),
      twoFacHomeWait
    ]);

    await use({
      page,
      username,
      email,
      password,
      twoFacKey: twoFactorKey,
      twoFacRecovery: plainRecoveryCode
    });
  },
  partKey: async ({ browser }, use) => {
    const { username, email } = await generateRandomTestUser('partial_passkey');
    const context = await browser.newContext();
    const page = await context.newPage();

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
    const emailVerifyWait = page.waitForURL('/auth/email-verification');
    await Promise.all([
      page.getByRole('button', { name: 'Sign Up', exact: true }).click(),
      emailVerifyWait
    ]);
    await use({ page, username, email, authenticatorId });
  },
  fullKey: async ({ browser }, use) => {
    const { username, email } = await generateRandomTestUser('full_passkey');
    const context = await browser.newContext();
    const page = await context.newPage();

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
    const emailVerifyWait = page.waitForURL('/auth/email-verification');
    await Promise.all([
      page.getByRole('button', { name: 'Sign Up', exact: true }).click(),
      emailVerifyWait
    ]);
    const [emailVerification] = await mainDb
      .select()
      .from(emailVerifications)
      .where(eq(emailVerifications.email, email.toLowerCase()));
    await page.getByLabel('Verification Code').click();
    await page.getByLabel('Verification Code').fill(emailVerification.code);
    const homeWait = page.waitForURL('/');
    await Promise.all([page.getByRole('button', { name: 'Activate' }).click(), homeWait]);
    await use({ page, username, email, authenticatorId });
  },
  twoFacKey: async ({ browser }, use) => {
    const { username, email } = await generateRandomTestUser('full_passkey');
    const context = await browser.newContext();
    const page = await context.newPage();

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
    const emailVerifyWait = page.waitForURL('/auth/email-verification');
    console.log('here');
    await Promise.all([
      page.getByRole('button', { name: 'Sign Up', exact: true }).click(),
      emailVerifyWait
    ]);
    console.log('after');
    const [emailVerification] = await mainDb
      .select()
      .from(emailVerifications)
      .where(eq(emailVerifications.email, email.toLowerCase()));
    await page.getByLabel('Verification Code').click();
    await page.getByLabel('Verification Code').fill(emailVerification.code);
    const homeWait = page.waitForURL('/');
    await Promise.all([page.getByRole('button', { name: 'Activate' }).click(), homeWait]);

    await page.goto('/auth/2fa/setup');
    await page.locator('button[data-button-root]:has(svg.lucide-eye)').click();
    await page.locator('input[type="text"][disabled]').waitFor({ state: 'visible' });
    const plainTwoFactor = await page.locator('input[type="text"][disabled]').inputValue();

    const twoFactorKey = decodeBase32(plainTwoFactor);

    await page.getByPlaceholder('XXXXXX').click();
    await page.getByPlaceholder('XXXXXX').fill(generateTOTP(twoFactorKey, 30, 6));
    const totpCodeVerificationResponse = page.waitForResponse('/auth/2fa/setup?/verify-otp');
    await Promise.all([
      page.locator('form').getByRole('button').click(),
      totpCodeVerificationResponse
    ]);

    // if this fails, it's usually because the otp code got rejected (~0.2% failure rate)
    // unlucky timing of code creation towards end of lifecycle
    const recoveryCodeWait = page.waitForURL('/auth/2fa/setup/recovery');
    await Promise.all([page.getByRole('button', { name: 'Continue' }).click(), recoveryCodeWait]);
    await page.getByRole('button').nth(1).click();
    const plainRecoveryCode = await page.locator('input[type="text"][disabled]').inputValue();

    const twoFacHomeWait = page.waitForURL('/');
    await page.getByRole('button', { name: 'Activate 2 Factor' }).click();
    await Promise.all([
      await page.getByRole('button', { name: 'Activate', exact: true }).click(),
      twoFacHomeWait
    ]);

    await use({
      page,
      username,
      email,
      authenticatorId,
      twoFacKey: twoFactorKey,
      twoFacRecovery: plainRecoveryCode
    });
  }
});

export const logout = async (page: Page) => {
  return await page.evaluate(async () => {
    await fetch('/auth/logout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
  });
};
