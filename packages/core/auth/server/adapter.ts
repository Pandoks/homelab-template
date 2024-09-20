import { eq, lte } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type { Adapter, DatabaseSession, DatabaseUser, UserId } from "lucia";
import {
  sessions,
  twoFactorAuthenticationCredentials,
} from "../../database/main/schema/auth.sql";
import { emails, users } from "../../database/main/schema/user.sql";

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
    sessionId: string,
  ): Promise<[session: DatabaseSession | null, user: DatabaseUser | null]> {
    const results = await this.db
      .select({
        user: {
          id: users.id,
          username: users.username,
        },
        session: {
          id: sessions.id,
          expiresAt: sessions.expiresAt,
          isTwoFactorVerified: sessions.isTwoFactorVerified,
          isPasskeyVerified: sessions.isPasskeyVerified,
        },
        email: {
          email: emails.email,
          isVerified: emails.isVerified,
        },
        hasTwoFactor: twoFactorAuthenticationCredentials.activated,
      })
      .from(sessions)
      .innerJoin(users, eq(sessions.userId, users.id))
      .innerJoin(emails, eq(emails.userId, users.id))
      .leftJoin(
        twoFactorAuthenticationCredentials,
        eq(twoFactorAuthenticationCredentials.userId, users.id),
      )
      .where(eq(sessions.id, sessionId))
      .limit(1);
    if (!results.length) return [null, null];
    const { user, session, email, hasTwoFactor } = results[0];

    const userAttributes = {
      username: user.username,
      email: email.email,
      isEmailVerified: email.isVerified,
      hasTwoFactor: !!hasTwoFactor,
    };
    const sessionAttributes = {
      isTwoFactorVerified: session.isTwoFactorVerified,
      isPasskeyVerified: session.isPasskeyVerified,
    };

    const sessionData = {
      id: session.id,
      userId: user.id,
      expiresAt: session.expiresAt,
      attributes: sessionAttributes,
    };
    const userData = {
      id: user.id,
      attributes: userAttributes,
    };
    return [sessionData, userData];
  }

  public async getUserSessions(userId: UserId): Promise<DatabaseSession[]> {
    const results = await this.db
      .select()
      .from(sessions)
      .where(eq(sessions.userId, userId));
    return results.map((session) => {
      const { id, userId, expiresAt, ...sessionAttributes } = session;
      return { id, userId, expiresAt, attributes: sessionAttributes };
    });
  }

  public async setSession(session: DatabaseSession): Promise<void> {
    await this.db
      .insert(sessions)
      .values({
        id: session.id,
        userId: session.userId,
        expiresAt: session.expiresAt,
        ...session.attributes,
      })
      .onConflictDoUpdate({
        target: sessions.id,
        set: {
          userId: session.userId,
          expiresAt: session.expiresAt,
          ...session.attributes,
        },
      });
  }

  public async updateSessionExpiration(
    sessionId: string,
    expiresAt: Date,
  ): Promise<void> {
    await this.db
      .update(sessions)
      .set({ expiresAt: expiresAt })
      .where(eq(sessions.id, sessionId));
  }
}
