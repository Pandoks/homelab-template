import { sha1 } from "@oslojs/crypto/sha1";
import { DatabaseAdapter } from "./adapter";
import { database } from "../../database/main";
import {
  encodeBase32LowerCaseNoPadding,
  encodeHexLowerCase,
} from "@oslojs/encoding";
import { Session, sessions } from "../../database/main/schema/auth.sql";
import { sha256 } from "@oslojs/crypto/sha2";
import { User, users } from "../../database/main/schema/user.sql";
import { eq } from "drizzle-orm";

const APP_STAGE = process.env.APP_STAGE;

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
  const result = await database
    .select({ user: users, session: sessions })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(eq(sessions.id, sessionId));
  if (result.length < 1) {
    return { session: null, user: null };
  }
  const { user, session } = result[0];
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
  return { session, user };
};

export const invalidateSession = async (sessionId: string): Promise<void> => {
  await database.delete(sessions).where(eq(sessions.id, sessionId));
};

export type SessionValidationResult =
  | { session: Session; user: User }
  | { session: null; user: null };

const adapter = new DatabaseAdapter(database);

export const lucia = new Lucia(adapter, {
  sessionCookie: {
    attributes: {
      secure: APP_STAGE === "production", // sets `Secure` flag in HTTPS
    },
  },
  getUserAttributes: (attributes) => {
    return {
      username: attributes.username,
      email: attributes.email,
      isEmailVerified: attributes.isEmailVerified,
      hasTwoFactor: attributes.hasTwoFactor,
    };
  },
  getSessionAttributes: (attributes) => {
    return {
      isTwoFactorVerified: attributes.isTwoFactorVerified,
      isPasskeyVerified: attributes.isPasskeyVerified,
    };
  },
});

// gives lucia's module types
declare module "lucia" {
  interface Register {
    Lucia: typeof lucia;
    DatabaseUserAttributes: DatabaseUserAttributes;
    DatabaseSessionAttributes: DatabaseSessionAttributes;
  }
}

// attributes of user for auth from the database
export interface DatabaseUserAttributes {
  username: string;
  email: string;
  isEmailVerified: boolean;
  hasTwoFactor: boolean;
}

// attributes of session for a user from the database
export interface DatabaseSessionAttributes {
  isTwoFactorVerified: boolean;
  isPasskeyVerified: boolean;
}

export const verifyPasswordStrength = async (password: string) => {
  const hash = encodeHex(sha1(new TextEncoder().encode(password)));
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
