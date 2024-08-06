import type { Actions, PageServerLoad } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { db } from '$lib/db/postgres';
import { eq } from 'drizzle-orm';
import { sha256 } from 'oslo/crypto';
import { encodeHex } from 'oslo/encoding';
import { users } from '$lib/db/postgres/schema';
import { superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import { twoFactorRecoverySchema } from './schema';
import { lucia } from '$lib/auth/server';
import { Throttler } from '$lib/rate-limit/server';
import type { RedisClientType } from 'redis';
import { redis } from '$lib/db/redis';

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

    const recoveryForm = await superValidate(event, zod(twoFactorRecoverySchema));
    if (!recoveryForm.valid) {
      return fail(400, {
        success: false,
        throttled: false,
        recoveryForm
      });
    }

    const ipAddress = event.getClientAddress();
    const throttleKey = `${user.id}:${ipAddress}`;
    if (!(await throttler.check(throttleKey))) {
      return fail(429, {
        success: false,
        throttled: true,
        recoveryForm
      });
    }

    const twoFactorRecoveryCodeHash = encodeHex(
      await sha256(new TextEncoder().encode(recoveryForm.data.recoveryCode))
    );
    const [userInfo] = await db.main
      .select()
      .from(users)
      .where(eq(users.twoFactorRecoveryHash, twoFactorRecoveryCodeHash))
      .limit(1);
    if (!userInfo) {
      throttler.increment(throttleKey);
      recoveryForm.errors.recoveryCode = ['Invalid'];
      return fail(400, {
        success: false,
        throttled: false,
        recoveryForm
      });
    }

    await db.main
      .update(users)
      .set({ twoFactorSecret: null, twoFactorRecoveryHash: null, hasTwoFactor: false })
      .where(eq(users.id, user.id));

    await throttler.reset(throttleKey);
    await lucia.invalidateUserSessions(user.id);
    const session = await lucia.createSession(user.id, {
      isTwoFactorVerified: false,
      isPasskeyVerified: false
    });
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
