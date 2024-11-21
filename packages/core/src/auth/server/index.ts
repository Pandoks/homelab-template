import { sha1 } from "@oslojs/crypto/sha1";
import {
  encodeBase32LowerCaseNoPadding,
  encodeHexLowerCase,
} from "@oslojs/encoding";
import {
  Session,
  passkeys,
  sessions,
  twoFactorAuthenticationCredentials,
} from "../../database/main/schema/auth.sql";
import { sha256 } from "@oslojs/crypto/sha2";
import { User, emails, users } from "../../database/main/schema/user.sql";
import { eq } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";

export const generateSessionToken = (): string => {
  const bytes = new Uint8Array(20);
  crypto.getRandomValues(bytes);
  return encodeBase32LowerCaseNoPadding(bytes);
};

export const createSession = async ({
  sessionToken,
  userId,
  isTwoFactorVerified,
  isPasskeyVerified,
  database,
}: {
  sessionToken: string;
  userId: string;
  isTwoFactorVerified: boolean;
  isPasskeyVerified: boolean;
  database: PostgresJsDatabase;
}): Promise<Session> => {
  const sessionId = encodeHexLowerCase(
    sha256(new TextEncoder().encode(sessionToken)),
  );
  const session: Session = {
    id: sessionId,
    userId,
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
    isTwoFactorVerified,
    isPasskeyVerified,
  };
  await database.insert(sessions).values(session);
  return session;
};

export const validateSessionToken = async ({
  sessionToken,
  database,
}: {
  sessionToken: string;
  database: PostgresJsDatabase;
}): Promise<SessionValidationResult> => {
  const sessionId = encodeHexLowerCase(
    sha256(new TextEncoder().encode(sessionToken)),
  );
  const { basicUserInfo } = await getUserDataFromSession({
    sessionId: sessionId,
    database: database,
  });
  if (!basicUserInfo) {
    return { session: null, user: null };
  }

  const { user, session, email, isEmailVerified, hasTwoFactor } = basicUserInfo;

  if (Date.now() >= session.expiresAt.getTime()) {
    await database.delete(sessions).where(eq(sessions.id, session.id));
    return { session: null, user: null };
  }
  if (Date.now() >= session.expiresAt.getTime() - 1000 * 60 * 60 * 24 * 15) {
    session.expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);
    await database
      .update(sessions)
      .set({
        expiresAt: session.expiresAt,
      })
      .where(eq(sessions.id, session.id));
  }
  return { session, user: { ...user, email, isEmailVerified, hasTwoFactor } };
};

export const invalidateSession = async ({
  sessionId,
  database,
}: {
  sessionId: string;
  database: PostgresJsDatabase;
}): Promise<void> => {
  await database.delete(sessions).where(eq(sessions.id, sessionId));
};

export const invalidateUserSessions = async ({
  userId,
  database,
}: {
  userId: string;
  database: PostgresJsDatabase;
}): Promise<void> => {
  await database.delete(sessions).where(eq(sessions.userId, userId));
};

export type SessionValidationResult =
  | { session: Session; user: User }
  | { session: null; user: null };

export const verifyPasswordStrength = async (password: string) => {
  const hash = encodeHexLowerCase(sha1(new TextEncoder().encode(password)));
  const hashPrefix = hash.slice(0, 5);

  const response = await fetch(
    `https://api.pwnedpasswords.com/range/${hashPrefix}`,
  );
  const data = await response.text();

  const items = data.split("\n");
  for (const item of items) {
    const hashSuffix = item.slice(0, 35).toLowerCase();
    if (hash === hashPrefix + hashSuffix) {
      return false;
    }
  }
  return true;
};

export const getUserDataFromSession = async ({
  sessionId,
  database,
}: {
  sessionId: string;
  database: PostgresJsDatabase;
}) => {
  const [basicUserInfo] = await database
    .select({
      user: users,
      session: sessions,
      email: emails.email,
      isEmailVerified: emails.isVerified,
      hasTwoFactor: twoFactorAuthenticationCredentials.activated,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .innerJoin(emails, eq(emails.userId, users.id))
    .innerJoin(
      twoFactorAuthenticationCredentials,
      eq(twoFactorAuthenticationCredentials.userId, users.id),
    )
    .where(eq(sessions.id, sessionId))
    .limit(1);
  if (!basicUserInfo) return { basicUserInfo: null, passkeyInfo: null };

  const passkeyInfo = await database
    .select({ name: passkeys.name })
    .from(passkeys)
    .where(eq(passkeys.userId, basicUserInfo.user.id));

  return { basicUserInfo, passkeyInfo };
};
