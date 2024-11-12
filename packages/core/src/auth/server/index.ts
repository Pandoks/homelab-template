import { sha1 } from "@oslojs/crypto/sha1";
import { database } from "../../database/main";
import {
  encodeBase32LowerCaseNoPadding,
  encodeHexLowerCase,
} from "@oslojs/encoding";
import { Session, sessions } from "../../database/main/schema/auth.sql";
import { sha256 } from "@oslojs/crypto/sha2";
import {
  User,
  getUserDataFromSession,
} from "../../database/main/schema/user.sql";
import { eq } from "drizzle-orm";

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
}: {
  sessionToken: string;
  userId: string;
  isTwoFactorVerified: boolean;
  isPasskeyVerified: boolean;
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

export const validateSessionToken = async (
  sessionToken: string,
): Promise<SessionValidationResult> => {
  const sessionId = encodeHexLowerCase(
    sha256(new TextEncoder().encode(sessionToken)),
  );
  const { basicUserInfo } = await getUserDataFromSession(sessionId);
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

export const invalidateSession = async (sessionId: string): Promise<void> => {
  await database.delete(sessions).where(eq(sessions.id, sessionId));
};

export const invalidateUserSessions = async (userId: string): Promise<void> => {
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
