import { lucia } from '$lib/server/auth';
import { fail, redirect } from '@sveltejs/kit';
import { z } from 'zod';
import { db } from '$lib/db';
import { users } from '$lib/db/schema';
import { TOTPController } from 'oslo/otp';
import { decodeHex } from 'oslo/encoding';
import { eq } from 'drizzle-orm';
import type { Actions, PageServerLoad } from './$types';

export const actions: Actions = {
  'verify-otp': async (event) => {
    const formData = await event.request.formData();
    const otp = formData.get('otp');
    if (!z.string().length(6).safeParse(otp).success) {
      return fail(400, {
        message: 'Invalid otp code'
      });
    }
    const { user, session } = await lucia.validateSession(event.locals.session.id);
    if (!user) {
      return fail(400, {
        message: 'Invalid otp code'
      });
    }
    const [userInfo] = await db.select().from(users).where(eq(users.id, user.id)).limit(1);
    if (
      !userInfo ||
      !userInfo.twoFactorSecret ||
      (user.isTwoFactor && session.isTwoFactorVerified)
    ) {
      return fail(400, {
        message: 'Invalid otp code'
      });
    }
    const validOTP = await new TOTPController().verify(
      otp as string,
      decodeHex(userInfo.twoFactorSecret)
    );
    if (validOTP) {
      const session = await lucia.createSession(user.id, { isTwoFactorVerified: true });
      const sessionCookie = lucia.createSessionCookie(session.id);
      event.cookies.set(sessionCookie.name, sessionCookie.value, {
        path: '.',
        ...sessionCookie.attributes
      });

      redirect(302, '/');
    }

    return fail(400, {
      message: 'Invalid otp code'
    });
  }
};

export const load: PageServerLoad = async (event) => {
  const { user } = await lucia.validateSession(event.locals.session.id);
  if (!user || !user.isTwoFactor) redirect(302, '/');

  return {
    username: user.username
  };
};
