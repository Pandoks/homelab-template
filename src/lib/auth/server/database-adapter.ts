import { emails, users } from '$lib/db/postgres/schema';
import { sessions, twoFactorAuthenticationCredentials } from '$lib/db/postgres/schema/auth';
import { eq, lte } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type { Adapter, DatabaseSession, DatabaseUser, UserId } from 'lucia';

export class DatabaseAdapter implements Adapter {
  private db: PostgresJsDatabase;

  constructor(authDb: PostgresJsDatabase) {
    this.db = authDb;
  }

  public async deleteExpiredSessions(): Promise<void> {
    await this.db.delete(sessions).where(lte(sessions.expiresAt, new Date()));
  }

  public async deleteSession(sessionId: string): Promise<void> {
    await this.db.delete(sessions).where(eq(sessions.id, sessionId));
  }

  public async deleteUserSessions(userId: UserId): Promise<void> {
    await this.db.delete(sessions).where(eq(sessions.userId, userId));
  }

  public async getSessionAndUser(
    sessionId: string
  ): Promise<[session: DatabaseSession | null, user: DatabaseUser | null]> {
    const results = await this.db
      .select({
        user: users,
        session: sessions,
        email: emails,
        twoFactorCredential: twoFactorAuthenticationCredentials.twoFactorSecret
      })
      .from(sessions)
      .innerJoin(users, eq(sessions.userId, users.id))
      .innerJoin(emails, eq(emails.userId, users.id))
      .innerJoin(
        twoFactorAuthenticationCredentials,
        eq(twoFactorAuthenticationCredentials.userId, users.id)
      )
      .where(eq(sessions.id, sessionId));
    if (results.length !== 1) return [null, null];
    const result = results[0];

    const { id: sessionDatabaseId, userId, expiresAt, ...sessionAttributes } = result.session;
    const { id, ...userDatabaseAttributes } = result.user;
    const { email, isVerified: isEmailVerified } = result.email;

    const userAttributes = {
      email,
      isEmailVerified,
      hasTwoFactor: !!result.twoFactorCredential,
      ...userDatabaseAttributes
    };

    const sessionData = {
      userId,
      id: sessionDatabaseId,
      expiresAt,
      attributes: sessionAttributes
    };
    const userData = {
      id,
      attributes: userAttributes
    };
    return [sessionData, userData];
  }

  public async getUserSessions(userId: UserId): Promise<DatabaseSession[]> {
    const results = await this.db.select().from(sessions).where(eq(sessions.userId, userId));
    return results.map((session) => {
      const { id, userId, expiresAt, ...sessionAttributes } = session;
      return { id, userId, expiresAt, attributes: sessionAttributes };
    });
  }

  public async setSession(session: DatabaseSession): Promise<void> {
    await this.db.insert(sessions).values({
      id: session.id,
      userId: session.userId,
      expiresAt: session.expiresAt,
      ...session.attributes
    });
  }

  public async updateSessionExpiration(sessionId: string, expiresAt: Date): Promise<void> {
    await this.db.update(sessions).set({ expiresAt }).where(eq(sessions.id, sessionId));
  }
}
