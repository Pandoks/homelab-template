import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { verify } from '@node-rs/argon2';
import { handleAlreadyLoggedIn, lucia } from '$lib/auth/server';
import { db } from '$lib/db/server/postgres';
import { emails, users } from '$lib/db/postgres/schema';
import { eq } from 'drizzle-orm';
import { superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import { loginPasskeySchema, loginSchema } from './schema';
import { emailSchema } from '../schema';
import { verifyPasskey } from '$lib/auth/passkey/server';
import { Throttler } from '$lib/rate-limit/server';
import { redis } from '$lib/db/server/redis';
import type { RedisClientType } from 'redis';
import { twoFactorAuthenticationCredentials } from '$lib/db/postgres/schema/auth';
import { building } from '$app/environment';
import { NODE_ENV } from '$env/static/private';

const timeoutSeconds = NODE_ENV === 'test' ? [0] : [1, 2, 4, 8, 16, 30, 60, 180, 300, 600];
const throttler = !building
  ? new Throttler({
      name: 'login-throttle',
      storage: redis.main.instance as RedisClientType,
      timeoutSeconds: timeoutSeconds,
      resetType: 'instant',
      cutoffSeconds: 24 * 60 * 60,
      grace: 5
    })
  : undefined;

export const actions: Actions = {
  login: async (event) => {
    handleAlreadyLoggedIn(event);
    if (event.locals.session) {
      return redirect(302, '/');
    }

    const ipAddress = event.getClientAddress();
    const throttleCheck = throttler?.check(ipAddress);
    const formValidation = superValidate(event, zod(loginSchema));
    const [loginForm, validThrottle] = await Promise.all([formValidation, throttleCheck]);
    if (!loginForm.valid) {
      return fail(400, {
        success: false,
        throttled: false,
        loginForm
      });
    } else if (!validThrottle) {
      return fail(429, {
        success: false,
        throttled: true,
        loginForm
      });
    }

    let isUsername = true;
    const usernameOrEmail = loginForm.data.usernameOrEmail.toLowerCase();
    if (emailSchema.safeParse(usernameOrEmail).success) {
      isUsername = false;
    }

    let userInfo: {
      user: { id: string; passwordHash: string | null };
      isEmailVerified: boolean;
      twoFactorSecret: string | null;
    } | null = null;
    if (isUsername) {
      [userInfo] = await db.main
        .select({
          user: {
            id: users.id,
            passwordHash: users.passwordHash
          },
          isEmailVerified: emails.isVerified,
          twoFactorSecret: twoFactorAuthenticationCredentials.twoFactorSecret
        })
        .from(users)
        .innerJoin(emails, eq(emails.userId, users.id))
        .leftJoin(
          twoFactorAuthenticationCredentials,
          eq(twoFactorAuthenticationCredentials.userId, users.id)
        )
        .where(eq(users.username, usernameOrEmail))
        .limit(1);
    } else {
      [userInfo] = await db.main
        .select({
          user: {
            id: users.id,
            passwordHash: users.passwordHash
          },
          isEmailVerified: emails.isVerified,
          twoFactorSecret: twoFactorAuthenticationCredentials.twoFactorSecret
        })
        .from(emails)
        .innerJoin(users, eq(users.id, emails.userId))
        .leftJoin(
          twoFactorAuthenticationCredentials,
          eq(twoFactorAuthenticationCredentials.userId, users.id)
        )
        .where(eq(emails.email, usernameOrEmail))
        .limit(1);
    }
    if (!userInfo || !userInfo.user.passwordHash) {
      throttler?.increment(ipAddress);
      return fail(400, {
        success: false,
        throttled: false,
        loginForm
      });
    }

    const validPassword = await verify(userInfo.user.passwordHash, loginForm.data.password, {
      memoryCost: 19456,
      timeCost: 2,
      outputLen: 32,
      parallelism: 1
    });
    if (!validPassword) {
      throttler?.increment(ipAddress);
      return fail(400, {
        success: false,
        throttled: false,
        loginForm
      });
    }

    const throttleReset = throttler?.reset(ipAddress);
    const sessionCreation = lucia.createSession(userInfo.user.id, {
      isTwoFactorVerified: false,
      isPasskeyVerified: false
    });
    const [session] = await Promise.all([sessionCreation, throttleReset]);
    const sessionCookie = lucia.createSessionCookie(session.id);
    event.cookies.set(sessionCookie.name, sessionCookie.value, {
      path: '/',
      ...sessionCookie.attributes
    });

    if (!userInfo.isEmailVerified) {
      return redirect(302, '/auth/email-verification');
    } else if (userInfo.twoFactorSecret) {
      return redirect(302, '/auth/2fa/otp');
    }

    return redirect(302, '/');
  },
  'login-passkey': async (event) => {
    handleAlreadyLoggedIn(event);
    if (event.locals.session) {
      return redirect(302, '/');
    }

    const ipAddress = event.getClientAddress();
    const throttleCheck = throttler?.check(ipAddress);
    const formValidation = await superValidate(event, zod(loginPasskeySchema));
    const [loginForm, validThrottle] = await Promise.all([formValidation, throttleCheck]);
    if (!loginForm.valid) {
      return fail(400, {
        success: false,
        throttled: false,
        loginForm
      });
    } else if (!validThrottle) {
      return fail(429, {
        success: false,
        throttled: true,
        loginForm
      });
    }

    let isUsername = true;
    const usernameOrEmail = loginForm.data.usernameOrEmail.toLowerCase();
    if (emailSchema.safeParse(usernameOrEmail).success) {
      isUsername = false;
    }

    let userInfo: { user: { id: string }; isEmailVerified: boolean } | null = null;
    if (isUsername) {
      [userInfo] = await db.main
        .select({
          user: {
            id: users.id
          },
          isEmailVerified: emails.isVerified
        })
        .from(users)
        .innerJoin(emails, eq(emails.userId, users.id))
        .where(eq(users.username, usernameOrEmail))
        .limit(1);
    } else {
      [userInfo] = await db.main
        .select({
          user: {
            id: users.id
          },
          isEmailVerified: emails.isVerified
        })
        .from(emails)
        .innerJoin(users, eq(users.id, emails.userId))
        .where(eq(emails.email, usernameOrEmail))
        .limit(1);
    }

    if (!userInfo) {
      return fail(400, {
        success: false,
        throttled: false,
        loginForm
      });
    }

    const isValidPasskey = await verifyPasskey({
      userId: userInfo.user.id,
      challengeId: loginForm.data.challengeId,
      credentialId: loginForm.data.credentialId,
      signature: loginForm.data.signature,
      encodedAuthenticatorData: loginForm.data.encodedAuthenticatorData,
      clientDataJSON: loginForm.data.clientDataJSON
    });
    if (!isValidPasskey) {
      throttler?.increment(ipAddress);
      return fail(400, {
        success: false,
        throttled: false,
        loginForm
      });
    }

    const throttleReset = throttler?.reset(ipAddress);
    const sessionCreation = lucia.createSession(userInfo.user.id, {
      isTwoFactorVerified: false,
      isPasskeyVerified: true
    });
    const [session] = await Promise.all([sessionCreation, throttleReset]);
    const sessionCookie = lucia.createSessionCookie(session.id);
    event.cookies.set(sessionCookie.name, sessionCookie.value, {
      path: '/',
      ...sessionCookie.attributes
    });

    if (!userInfo.isEmailVerified) {
      return redirect(302, '/auth/email-verification');
    }

    return redirect(302, '/');
  }
};

export const load: PageServerLoad = async (event) => {
  handleAlreadyLoggedIn(event);
  if (event.locals.session) {
    return redirect(302, '/');
  }

  return {
    loginForm: await superValidate(zod(loginSchema)),
    loginPasskeyForm: await superValidate(zod(loginPasskeySchema))
  };
};
