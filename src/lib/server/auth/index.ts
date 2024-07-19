import { Lucia, type Session, type User } from 'lucia';
import { dev } from '$app/environment';
import { db } from '$lib/db';
import { users } from '$lib/db/schema';
import { sessions } from '$lib/db/schema/auth';
import { DrizzlePostgreSQLAdapter } from '@lucia-auth/adapter-drizzle';
import { redirect, type ServerLoadEvent } from '@sveltejs/kit';
import { goto } from '$app/navigation';

const adapter = new DrizzlePostgreSQLAdapter(db, sessions, users);

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
      isTwoFactorVerified: attributes.isTwoFactorVerified
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
}

export const handleAlreadyLoggedIn = (event: ServerLoadEvent): void => {
  const session: Session | null = event.locals.session;
  const user: User | null = event.locals.user;
  if (session && user) {
    if (user.hasTwoFactor && !session.isTwoFactorVerified) {
      return redirect(302, '/auth/2fa/otp');
    } else if (!user.isEmailVerified) {
      return redirect(302, '/auth/email-verification');
    }
  }
};

export const signOut = async () => {
  try {
    const response = await fetch('/auth/logout', {
      method: 'post',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      goto('/auth/login');
    } else {
      throw Error('Sign out failed');
    }
  } catch (err) {
    console.error('Error during sign-out: ', err);
  }
};
