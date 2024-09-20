import { fail, redirect } from '@sveltejs/kit';
import { db } from '$lib/db/server/postgres';
import { TOTPController } from 'oslo/otp';
import { decodeHex } from 'oslo/encoding';
import { eq } from 'drizzle-orm';
import type { Actions, PageServerLoad } from './$types';
import { superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import { oneTimePasswordSchema } from './schema';
import { redis } from '$lib/db/server/redis';
import type { RedisClientType } from 'redis';
import { Throttler } from '$lib/rate-limit/server';
import { twoFactorAuthenticationCredentials } from '$lib/db/postgres/schema/auth';
import { building } from '$app/environment';
import { lucia } from '@startup-template/core/auth/server';

const throttler = !building
  ? new Throttler({
      name: '2fa-otp',
      storage: redis.main.instance as RedisClientType,
      timeoutSeconds: [1, 2, 4, 8, 16, 30, 60, 180, 300, 600],
      resetType: 'instant',
      cutoffSeconds: 24 * 60 * 60,
      grace: 5
    })
  : undefined;

export const actions: Actions = {
  'verify-otp': async (event) => {
    const session = event.locals.session;
    const user = event.locals.user;
    if (!session || !user) {
      return redirect(302, '/auth/login');
    } else if (!user.hasTwoFactor || (user.hasTwoFactor && session.isTwoFactorVerified)) {
      return redirect(302, '/');
    }

    const throttleKey = `${user.id}`;

    const otpFormValidation = superValidate(event, zod(oneTimePasswordSchema));
    const throttlerCheck = throttler?.check(throttleKey);

    const [otpForm, throttleValid] = await Promise.all([otpFormValidation, throttlerCheck]);

    if (!throttleValid) {
      return fail(429, {
        success: false,
        throttled: true,
        otpForm
      });
    } else if (!otpForm.valid) {
      return fail(400, {
        success: false,
        throttled: false,
        otpForm
      });
    }

    const [{ twoFactorSecret }] = await db.main
      .select({
        twoFactorSecret: twoFactorAuthenticationCredentials.twoFactorSecret
      })
      .from(twoFactorAuthenticationCredentials)
      .where(eq(twoFactorAuthenticationCredentials.userId, user.id))
      .limit(1);
    if (!twoFactorSecret) {
      return fail(400, {
        success: false,
        throttled: false,
        otpForm
      });
    }

    const validOTP = await new TOTPController().verify(
      otpForm.data.otp,
      decodeHex(twoFactorSecret)
    );
    if (!validOTP) {
      await throttler?.increment(throttleKey);
      otpForm.errors.otp = ['Invalid code'];
      return fail(400, {
        success: false,
        throttled: false,
        otpForm
      });
    }

    const throttleReset = throttler?.reset(throttleKey);
    const sessionCreation = lucia.createSession(user.id, {
      isTwoFactorVerified: true,
      isPasskeyVerified: false
    });
    const [newSession] = await Promise.all([sessionCreation, throttleReset]);
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
