import { redis, type RedisInstance } from './redis';
import { db } from './db';
import { sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type { RedisClientType, RedisClusterType } from 'redis';
import type { Page } from '@playwright/test';
import { emails, users } from '$lib/db/postgres/schema';
import { hash } from '@node-rs/argon2';

export const resetTestDatabases = async () => {
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
export const createNewUser = async ({
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
      username: username,
      passwordHash: PASSWORD_HASH
    });
    await tsx.insert(emails).values({
      email: email,
      isVerified: emailVerified,
      userId: username
    });
  });
};

export const newlySignedUpUser = async ({
  page,
  username,
  email
}: {
  page: Page;
  username: string;
  email: string;
}) => {
  await page.goto('/auth/signup');

  await page.getByLabel('Username').fill(username);
  await page.getByLabel('Email').fill(email);
  await page.locator('input[name="password"]').fill('=+s8W$5)Ww6$t@cS!hqkx');
  await page.getByRole('button', { name: 'Sign Up', exact: true }).click();

  await page.waitForURL('/auth/email-verification');
};

export const newlyEmailVerifiedUser = async ({
  page,
  username,
  email
}: {
  page: Page;
  username: string;
  email: string;
}) => {
  await page.goto('/auth/signup');

  await page.getByLabel('Username').fill(username);
  await page.getByLabel('Email').fill(email);
  await page.locator('input[name="password"]').fill('=+s8W$5)Ww6$t@cS!hqkx');
  await page.getByRole('button', { name: 'Sign Up', exact: true }).click();

  await page.waitForURL('/auth/email-verification');
  await page.getByLabel('Verification Code').fill('TEST');
  await page.getByRole('button', { name: 'Activate' }).click();
};
