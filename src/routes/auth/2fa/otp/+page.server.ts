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

export const actions: Actions = {
  'verify-otp': async (event) => {
    const otpForm = await superValidate(event, zod(oneTimePasswordSchema));
    if (!otpForm.valid) {
      return fail(400, {
        success: false,
        otpForm
      });
    }

    const user = event.locals.user;
    const session = event.locals.session;
    if (!user || !session) {
      return fail(400, {
        success: false,
        otpForm
      });
    }
    const [userInfo] = await db.select().from(users).where(eq(users.id, user.id)).limit(1);
    if (!userInfo || !userInfo.twoFactorSecret) {
      return fail(400, {
        success: false,
        otpForm
      });
    }

    const validOTP = await new TOTPController().verify(
      otpForm.data.otp,
      decodeHex(userInfo.twoFactorSecret)
    );
    if (validOTP) {
      const session = await lucia.createSession(user.id, {
        isTwoFactorVerified: true,
        isPasskeyVerified: false
      });
      const sessionCookie = lucia.createSessionCookie(session.id);
      event.cookies.set(sessionCookie.name, sessionCookie.value, {
        path: '/',
        ...sessionCookie.attributes
      });

      return redirect(302, '/');
    }

    otpForm.errors.otp = ['Invalid code'];
    return fail(400, {
      success: false,
      otpForm
    });
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
