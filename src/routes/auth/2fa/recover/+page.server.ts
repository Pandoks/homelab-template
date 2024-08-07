import type { Actions, PageServerLoad } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { db } from '$lib/db/postgres';
import { count, eq } from 'drizzle-orm';
import { sha256 } from 'oslo/crypto';
import { encodeHex } from 'oslo/encoding';
import { superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import { twoFactorRecoverySchema } from './schema';
import { lucia } from '$lib/auth/server';
import { Throttler } from '$lib/rate-limit/server';
import type { RedisClientType } from 'redis';
import { redis } from '$lib/db/redis';
import { twoFactorAuthenticationCredentials } from '$lib/db/postgres/schema/auth';

const throttler = new Throttler({
  name: '2fa-recovery',
  storage: redis.main.instance as RedisClientType,
  timeoutSeconds: [1, 2, 4, 8, 16, 30, 60, 180, 300, 600],
  resetType: 'instant',
  cutoffSeconds: 24 * 60 * 60,
  grace: 5
});

export const actions: Actions = {
  'recover-2fa': async (event) => {
    const existingSession = event.locals.session;
    const user = event.locals.user;
    if (!existingSession || !user) {
      return redirect(302, '/auth/login');
    } else if (existingSession.isTwoFactorVerified || !user.hasTwoFactor) {
      return redirect(302, '/');
    } else if (!user.isEmailVerified) {
      return redirect(302, '/auth/email-verification');
    }

    const ipAddress = event.getClientAddress();
    const throttleKey = `${user.id}:${ipAddress}`;
    const recoveryFormCheck = superValidate(event, zod(twoFactorRecoverySchema));
    const throttlerCheck = throttler.check(throttleKey);
    const [recoveryForm, throttleCheck] = await Promise.all([recoveryFormCheck, throttlerCheck]);
    if (!recoveryForm.valid) {
      return fail(400, {
        success: false,
        throttled: false,
        recoveryForm
      });
    } else if (!throttleCheck) {
      return fail(429, {
        success: false,
        throttled: true,
        recoveryForm
      });
    }

    const twoFactorRecoveryCodeHash = encodeHex(
      await sha256(new TextEncoder().encode(recoveryForm.data.recoveryCode))
    );

    const [twoFactorRecovery] = await db.main
      .select({
        count: count()
      })
      .from(twoFactorAuthenticationCredentials)
      .where(
        eq(twoFactorAuthenticationCredentials.twoFactorRecoveryHash, twoFactorRecoveryCodeHash)
      )
      .limit(1);
    if (!twoFactorRecovery) {
      await throttler.increment(throttleKey);
      recoveryForm.errors.recoveryCode = ['Invalid'];
      return fail(400, {
        success: false,
        throttled: false,
        recoveryForm
      });
    }

    const twoFactorDeletion = db.main
      .delete(twoFactorAuthenticationCredentials)
      .where(eq(twoFactorAuthenticationCredentials.userId, user.id));

    const throttleReset = throttler.reset(throttleKey);
    const invalidateAllUserSessions = lucia.invalidateUserSessions(user.id);
    const sessionCreation = lucia.createSession(user.id, {
      isTwoFactorVerified: false,
      isPasskeyVerified: false
    });
    const [session] = await Promise.all([
      sessionCreation,
      invalidateAllUserSessions,
      throttleReset,
      twoFactorDeletion
    ]);
    const sessionCookie = lucia.createSessionCookie(session.id);
    event.cookies.set(sessionCookie.name, sessionCookie.value, {
      path: '/',
      ...sessionCookie.attributes
    });

    return redirect(302, '/');
  }
};

export const load: PageServerLoad = async (event) => {
  const session = event.locals.session;
  const user = event.locals.user;
  if (!session || !user) {
    return redirect(302, '/auth/login');
  } else if (session.isTwoFactorVerified || !user.hasTwoFactor) {
    return redirect(302, '/');
  } else if (!user.isEmailVerified) {
    return redirect(302, '/auth/email-verification');
  }

  return {
    recoveryForm: await superValidate(zod(twoFactorRecoverySchema))
  };
};
