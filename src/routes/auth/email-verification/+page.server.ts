import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { z } from 'zod';
import { lucia } from '$lib/server/auth';
import { db } from '$lib/db';
import { users } from '$lib/db/schema';
import { eq } from 'drizzle-orm';
import { verifyVerificationCode } from '$lib/server/auth/email';

export const actions: Actions = {
  'verify-email-code': async (event) => {
    const formData = await event.request.formData();
    const code = formData.get('code');
    if (!z.string().safeParse(code).success) {
      return fail(400, {
        message: 'Invalid code'
      });
    }
    const { user } = await lucia.validateSession(event.locals.session.id);
    if (!user) {
      return fail(400, {
        message: 'Invalid code'
      });
    }

    const isValidCode = await verifyVerificationCode({ user: user, code: code as string });
    if (!isValidCode) {
      return fail(400, {
        message: 'Invalid code'
      });
    }

    await lucia.invalidateUserSessions(user.id);
    await db.update(users).set({ isEmailVerified: true }).where(eq(users.id, user.id));

    const session = await lucia.createSession(user.id, { isTwoFactorVerified: false });
    const sessionCookie = lucia.createSessionCookie(session.id);
    event.cookies.set(sessionCookie.name, sessionCookie.value, {
      path: '.',
      ...sessionCookie.attributes
    });

    if (user.isTwoFactor) {
      redirect(302, '/auth/2fa/otp');
    }

    redirect(302, '/');
  }
};

export const load: PageServerLoad = async (event) => {
  // if (!event.locals.user) redirect(302, '/');
  // return {
  //   username: event.locals.user.username
  // };
};
