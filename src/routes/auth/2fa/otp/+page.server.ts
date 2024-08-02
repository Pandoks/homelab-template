import { lucia } from '$lib/auth/server';
import { fail, redirect } from '@sveltejs/kit';
import { db } from '$lib/db/postgres';
import { users } from '$lib/db/postgres/schema';
import { TOTPController } from 'oslo/otp';
import { decodeHex } from 'oslo/encoding';
import { eq } from 'drizzle-orm';
import type { Actions, PageServerLoad } from './$types';
import { superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import { oneTimePasswordSchema } from './schema';
import { redis } from '$lib/db/redis';
import type { RedisClientType } from 'redis';
import { Throttler } from '$lib/rate-limit/server';

const throttler = new Throttler({
  name: '2fa-otp',
  storage: redis.main as RedisClientType,
  timeoutSeconds: [1, 2, 4, 8, 16, 30, 60, 180, 300, 600],
  resetType: 'instant',
  cutoffMilli: 24 * 60 * 60 * 1000,
  grace: 5
});

export const actions: Actions = {
  'verify-otp': async (event) => {
    const session = event.locals.session;
    const user = event.locals.user;
    if (!session || !user) {
      return redirect(302, '/auth/login');
    } else if (!user.hasTwoFactor || (user.hasTwoFactor && session.isTwoFactorVerified)) {
      return redirect(302, '/');
    }

    const otpForm = await superValidate(event, zod(oneTimePasswordSchema));
    if (!otpForm.valid) {
      return fail(400, {
        success: false,
        throttled: false,
        otpForm
      });
    }

    const throttleKey = `${user.id}`;
    if (!(await throttler.check(throttleKey))) {
      return fail(429, {
        success: false,
        throttled: true,
        otpForm
      });
    }

    const [userInfo] = await db.select().from(users).where(eq(users.id, user.id)).limit(1);
    if (!userInfo || !userInfo.twoFactorSecret) {
      return fail(400, {
        success: false,
        throttled: false,
        otpForm
      });
    }

    const validOTP = await new TOTPController().verify(
      otpForm.data.otp,
      decodeHex(userInfo.twoFactorSecret)
    );
    if (!validOTP) {
      throttler.increment(throttleKey);
      otpForm.errors.otp = ['Invalid code'];
      return fail(400, {
        success: false,
        throttled: false,
        otpForm
      });
    }

    await throttler.reset(throttleKey);
    const newSession = await lucia.createSession(user.id, {
      isTwoFactorVerified: true,
      isPasskeyVerified: false
    });
    const sessionCookie = lucia.createSessionCookie(newSession.id);
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
  } else if (!user.hasTwoFactor || (user.hasTwoFactor && session.isTwoFactorVerified)) {
    return redirect(302, '/');
  }

  return {
    otpForm: await superValidate(zod(oneTimePasswordSchema))
  };
};
