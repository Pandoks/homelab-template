import { db } from '$lib/db/server/postgres';
import { emails, users } from '$lib/db/postgres/schema';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { generateEmailVerification } from './email';
import { createDate } from 'oslo';
import { TimeSpan } from 'lucia';
import { emailVerifications } from '$lib/db/postgres/schema/auth';
import { eq } from 'drizzle-orm';

describe('generateEmailVerification', () => {
  let database: PostgresJsDatabase;

  beforeAll(async () => {
    database = db.main;
  });

  beforeEach(async () => {
    // user just signed up but hasn't verified their email
    await database.transaction(async (tsx) => {
      await tsx.insert(users).values({
        id: 'user',
        username: 'username',
        passwordHash: 'password'
      });
      await tsx.insert(emails).values({
        userId: 'user',
        email: 'test@example.com',
        isVerified: false
      });
    });
  });

  afterEach(async () => {
    await database.delete(users); // cascade deletes everything related
  });

  it('should give me code TEST', async () => {
    const result = await generateEmailVerification({ userId: 'user', email: 'test@example.com' });
    expect(result).toBe('TEST');
  });

  it('should delete existing email verifications', async () => {
    await database.insert(emailVerifications).values({
      email: 'test@example.com',
      code: 'WRONG',
      expiresAt: createDate(new TimeSpan(15, 'h'))
    });
    await generateEmailVerification({ userId: 'user', email: 'test@example.com' });

    const results = await database
      .select()
      .from(emailVerifications)
      .where(eq(emailVerifications.email, 'test@example.com'));
    expect(results.length).toBe(1);
    expect(results[0].code).toBe('TEST');
  });

  it('should not delete other email verifications', async () => {
    await database.transaction(async (tsx) => {
      await tsx.insert(users).values({
        id: 'user2',
        username: 'username2',
        passwordHash: 'password'
      });
      await tsx.insert(emails).values({
        userId: 'user2',
        email: 'test2@example.com',
        isVerified: false
      });
      await tsx.insert(emailVerifications).values({
        email: 'test@example.com',
        code: 'WRONG',
        expiresAt: createDate(new TimeSpan(15, 'h'))
      });
      await tsx.insert(emailVerifications).values({
        email: 'test2@example.com',
        code: 'WRONG',
        expiresAt: createDate(new TimeSpan(15, 'h'))
      });
    });
    const result = await generateEmailVerification({ userId: 'user', email: 'test@example.com' });
    expect(result).toBe('TEST');

    const [databaseResult] = await database
      .select()
      .from(emailVerifications)
      .where(eq(emailVerifications.email, 'test@example.com'));
    expect(databaseResult.code).toBe('TEST');

    const [databaseResultUntouched] = await database
      .select()
      .from(emailVerifications)
      .where(eq(emailVerifications.email, 'test2@example.com'));
    expect(databaseResultUntouched.code).toBe('WRONG');
  });
});
