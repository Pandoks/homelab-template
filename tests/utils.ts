import { type RedisInstance } from './redis';
import { db } from './db';
import { eq, sql } from 'drizzle-orm';
import { type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type { RedisClientType, RedisClusterType } from 'redis';
import { emails, users } from '$lib/db/postgres/schema';
import { hash } from '@node-rs/argon2';
import { test as testBase, type Page } from '@playwright/test';
import dotenv from 'dotenv';
import { alphabet, generateRandomString } from 'oslo/crypto';
import { generateIdFromEntropySize } from 'lucia';
import { emailVerifications } from '$lib/db/postgres/schema/auth';
import { base32 } from 'oslo/encoding';
import { TOTPController } from 'oslo/otp';

const { parsed: env } = dotenv.config({ path: `.env.test` });
if (!env) throw new Error('Need .env.test');

export const resetTestDatabases = async ({
  redis,
  db
}: {
  redis: { [key: string]: RedisInstance };
  db: { [key: string]: PostgresJsDatabase };
}) => {
  let cemetary: Promise<any>[] = [];

  const redisIds = Object.keys(redis);
  const dbIds = Object.keys(db);

  for (const redisId of redisIds) {
    const redisInstance = (redis as { [id: string]: RedisInstance })[redisId];
    if (redisInstance.type === 'client') {
      const redisClient = redisInstance.instance as RedisClientType;
      cemetary.push(redisClient.flushAll());
    } else if (redisInstance.type === 'cluster') {
      const redisCluster = redisInstance.instance as RedisClusterType;
      const masterNodes = redisCluster.masters;
      // gotta use a boomer loop because masterNodes' iterator returns strings
      for (let i = 0; i < masterNodes.length; i++) {
        const masterNode = masterNodes[i];
        const nodeClient = redisCluster.nodeClient(masterNode) as RedisClientType;
        cemetary.push(nodeClient.flushAll());
      }
    }
  }

  for (const dbId of dbIds) {
    const dbInstance = (db as { [id: string]: PostgresJsDatabase })[dbId];
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
  await db.main.transaction(async (tsx) => {
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
    let username = `${prefix}_${generateRandomString(6, alphabet('0-9', 'a-z', 'A-Z'))}`;
    const [existingUser] = await db.main.select().from(users).where(eq(users.username, username));
    if (existingUser) {
      username = await createUsername();
    }
    return username;
  };

  const username = await createUsername();

  return {
    username,
    email: `${username}@example.com`,
    password: generateIdFromEntropySize(25)
  };
};

export type AuthTest = {
  page: Page;
  username: string;
  email: string;
  password?: string;
  authenticatorId?: string;
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

    const [emailVerification] = await db.main
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

    const [emailVerification] = await db.main
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

    const twoFactorSecret = base32.decode(plainTwoFactor);

    await page.getByPlaceholder('XXXXXX').click();
    await page.getByPlaceholder('XXXXXX').fill('wrongs');
    const badTotpCodeVerificationResponse = page.waitForResponse('/auth/2fa/setup?/verify-otp');
    await Promise.all([
      page.getByRole('button', { name: 'Verify' }).click(),
      badTotpCodeVerificationResponse
    ]);

    const totpController = new TOTPController();
    await page.getByPlaceholder('XXXXXX').click();
    await page.getByPlaceholder('XXXXXX').fill(await totpController.generate(twoFactorSecret));
    const totpCodeVerificationResponse = page.waitForResponse('/auth/2fa/setup?/verify-otp');
    await Promise.all([
      page.locator('form').getByRole('button').click(),
      totpCodeVerificationResponse
    ]);

    // if this fails, it's usually because the otp code got rejected (~0.2% failure rate)
    // unlucky timing of code creation towards end of lifecycle
    const recoveryCodeWait = page.waitForURL('/auth/2fa/setup/recovery');
    await Promise.all([page.getByRole('button', { name: 'Continue' }).click(), recoveryCodeWait]);

    const twoFacHomeWait = page.waitForURL('/');
    await page.getByRole('button', { name: 'Activate 2 Factor' }).click();
    await Promise.all([
      await page.getByRole('button', { name: 'Activate', exact: true }).click(),
      twoFacHomeWait
    ]);

    await use({ page, username, email, password });
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
    const passwordFormWait = page.locator('form[action="?/signup"]').waitFor({ state: 'detached' });
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
    const passwordFormWait = page.locator('form[action="?/signup"]').waitFor({ state: 'detached' });
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
    const [emailVerification] = await db.main
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
    const passwordFormWait = page.locator('form[action="?/signup"]').waitFor({ state: 'detached' });
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
    const [emailVerification] = await db.main
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

    const twoFactorSecret = base32.decode(plainTwoFactor);

    await page.getByPlaceholder('XXXXXX').click();
    await page.getByPlaceholder('XXXXXX').fill('wrongs');
    const badTotpCodeVerificationResponse = page.waitForResponse('/auth/2fa/setup?/verify-otp');
    await Promise.all([
      page.getByRole('button', { name: 'Verify' }).click(),
      badTotpCodeVerificationResponse
    ]);

    const totpController = new TOTPController();
    await page.getByPlaceholder('XXXXXX').click();
    await page.getByPlaceholder('XXXXXX').fill(await totpController.generate(twoFactorSecret));
    const totpCodeVerificationResponse = page.waitForResponse('/auth/2fa/setup?/verify-otp');
    await Promise.all([
      page.locator('form').getByRole('button').click(),
      totpCodeVerificationResponse
    ]);

    // if this fails, it's usually because the otp code got rejected (~0.2% failure rate)
    // unlucky timing of code creation towards end of lifecycle
    const recoveryCodeWait = page.waitForURL('/auth/2fa/setup/recovery');
    await Promise.all([page.getByRole('button', { name: 'Continue' }).click(), recoveryCodeWait]);

    const twoFacHomeWait = page.waitForURL('/');
    await page.getByRole('button', { name: 'Activate 2 Factor' }).click();
    await Promise.all([
      await page.getByRole('button', { name: 'Activate', exact: true }).click(),
      twoFacHomeWait
    ]);

    await use({ page, username, email, authenticatorId });
  }
});
