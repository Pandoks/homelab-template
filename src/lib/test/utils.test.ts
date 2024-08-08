import { db } from '$lib/db/server/postgres';
import { emails, users } from '$lib/db/postgres/schema';
import {
  emailVerifications,
  passkeys,
  passwordResets,
  sessions,
  twoFactorAuthenticationCredentials
} from '$lib/db/postgres/schema/auth';
import { redis } from '$lib/db/server/redis';
import { count } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { TimeSpan } from 'lucia';
import { createDate } from 'oslo';
import type { RedisClientType } from 'redis';
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { resetTestDatabases } from './utils';

describe('resetTestDatabase', () => {
  let database: PostgresJsDatabase;
  let redisClient: RedisClientType;

  beforeAll(async () => {
    database = db.test!;
    redisClient = redis.test!.instance;
  });

  beforeEach(async () => {
    for (let i = 0; i < 10; i++) {
      const index = i.toString();
      const normalRedis = redisClient.set(index, index);
      const setRedis = redisClient.hSet(`set:${index}`, { text: index });

      const databaseFill = database.transaction(async (tsx) => {
        await tsx.insert(users).values({
          id: index,
          username: index,
          passwordHash: index
        });
        await tsx.insert(emails).values({
          email: `${index}@gmail.com`,
          isVerified: !!(i % 2),
          userId: index
        });
        await tsx.insert(sessions).values({
          id: index,
          userId: index,
          expiresAt: createDate(new TimeSpan(15, 'm')),
          isTwoFactorVerified: !!(i % 2),
          isPasskeyVerified: !!(i % 2)
        });
        await tsx.insert(emailVerifications).values({
          code: index,
          email: `${index}@gmail.com`,
          expiresAt: createDate(new TimeSpan(15, 'm'))
        });
        await tsx.insert(passwordResets).values({
          tokenHash: index,
          userId: index,
          expiresAt: createDate(new TimeSpan(15, 'm'))
        });
        await tsx.insert(passkeys).values({
          credentialId: index,
          name: index,
          algorithm: i % 2,
          encodedPublicKey: index,
          userId: index
        });
        await tsx.insert(twoFactorAuthenticationCredentials).values({
          userId: index,
          twoFactorSecret: index,
          twoFactorRecoveryHash: index,
          activated: !!(i % 2)
        });
      });

      await Promise.all([normalRedis, setRedis, databaseFill]);
    }
  });

  afterEach(async () => {
    redisClient.flushAll();
    await database.delete(users);
  });

  it('should delete everything', async () => {
    const keys = await redisClient.keys('*');
    expect(keys.length).toBe(20);

    const userQuery = await database.select({ count: count() }).from(users);
    expect(userQuery[0].count).toBe(10);

    await resetTestDatabases();

    const clearedKeys = await redisClient.keys('*');
    expect(clearedKeys.length).toBe(0);

    const clearedUserQuery = await database.select({ count: count() }).from(users);
    expect(clearedUserQuery[0].count).toBe(0);
  });
});
