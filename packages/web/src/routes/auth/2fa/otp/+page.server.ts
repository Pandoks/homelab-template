import { fail, redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import type { Actions, PageServerLoad } from './$types';
import { superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import { oneTimePasswordSchema } from './schema';
import { building } from '$app/environment';
import { Throttler } from '@startup-template/core/rate-limit/index';
import { database as mainDatabase } from '@startup-template/core/database/main/index';
import { twoFactorAuthenticationCredentials } from '@startup-template/core/database/main/schema/auth.sql';
import { createSession, generateSessionToken } from '@startup-template/core/auth/server/index';
import { decodeHex } from '@oslojs/encoding';
import { verifyTOTP } from '@oslojs/otp';
import { setSessionTokenCookie } from '$lib/auth/server/sessions';
import { mainRedis } from '$lib/redis';

const throttler = !building
  ? new Throttler({
      name: '2fa-otp',
      storage: mainRedis,
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

    const [{ twoFactorKey }] = await mainDatabase
      .select({
        twoFactorKey: twoFactorAuthenticationCredentials.twoFactorKey
      })
      .from(twoFactorAuthenticationCredentials)
      .where(eq(twoFactorAuthenticationCredentials.userId, user.id))
      .limit(1);
    if (!twoFactorKey) {
      return fail(400, {
        success: false,
        throttled: false,
        otpForm
      });
    }

    const validOTP = verifyTOTP(decodeHex(twoFactorKey), 30, 6, otpForm.data.otp);
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
    const sessionToken = generateSessionToken();
    const sessionCreation = createSession({
      sessionToken: sessionToken,
      userId: user.id,
      isTwoFactorVerified: true,
      isPasskeyVerified: false
    });
    const [newSession] = await Promise.all([sessionCreation, throttleReset]);
    setSessionTokenCookie({
      event: event,
      sessionToken: sessionToken,
      expiresAt: newSession.expiresAt
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
