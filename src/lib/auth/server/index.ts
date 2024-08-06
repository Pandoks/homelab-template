import { Lucia } from 'lucia';
import { dev } from '$app/environment';
import { db } from '$lib/db/postgres';
import { users } from '$lib/db/postgres/schema';
import { sessions } from '$lib/db/postgres/schema/auth';
import { DrizzlePostgreSQLAdapter } from '@lucia-auth/adapter-drizzle';
import { redirect, type RequestEvent, type ServerLoadEvent } from '@sveltejs/kit';
import { encodeHex } from 'oslo/encoding';
import { sha1 } from '@oslojs/crypto/sha1';

const adapter = new DrizzlePostgreSQLAdapter(db.main, sessions, users);

export const lucia = new Lucia(adapter, {
  sessionCookie: {
    attributes: {
      secure: !dev // sets `Secure` flag in HTTPS
    }
  },
  getUserAttributes: (attributes) => {
    return {
      username: attributes.username,
      email: attributes.email,
      isEmailVerified: attributes.isEmailVerified,
      hasTwoFactor: attributes.hasTwoFactor
    };
  },
  getSessionAttributes: (attributes) => {
    return {
      isTwoFactorVerified: attributes.isTwoFactorVerified,
      isPasskeyVerified: attributes.isPasskeyVerified
    };
  }
});

// gives lucia's module types
declare module 'lucia' {
  interface Register {
    Lucia: typeof lucia;
    DatabaseUserAttributes: DatabaseUserAttributes;
    DatabaseSessionAttributes: DatabaseSessionAttributes;
  }
}

// attributes of user for auth from the database
interface DatabaseUserAttributes {
  username: string;
  email: string;
  isEmailVerified: boolean;
  hasTwoFactor: boolean;
}

// attributes of session for a user from the database
interface DatabaseSessionAttributes {
  isTwoFactorVerified: boolean;
  isPasskeyVerified: boolean;
}

export const handleAlreadyLoggedIn = (event: ServerLoadEvent | RequestEvent): void => {
  const session = event.locals.session;
  const user = event.locals.user;
  if (session && user) {
    if (user.hasTwoFactor && !session.isTwoFactorVerified && !session.isPasskeyVerified) {
      return redirect(302, '/auth/2fa/otp');
    } else if (!user.isEmailVerified) {
      return redirect(302, '/auth/email-verification');
    }
  }
};

export const verifyPasswordStrength = async (password: string) => {
  const hash = encodeHex(sha1(new TextEncoder().encode(password)));
  const hashPrefix = hash.slice(0, 5);

  const response = await fetch(`https://api.pwnedpasswords.com/range/${hashPrefix}`);
  const data = await response.text();

  const items = data.split('\n');
  for (const item of items) {
    const hashSuffix = item.slice(0, 35).toLowerCase();
    if (hash === hashPrefix + hashSuffix) {
      return false;
    }
  }
  return true;
};
