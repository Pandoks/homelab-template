import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { lucia } from '$lib/server/auth';
import { db } from '$lib/db';
import { users } from '$lib/db/schema';
import { eq } from 'drizzle-orm';
import { verifyVerificationCode } from '$lib/server/auth/email';
import { superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import { verificationSchema } from './schema';
import type { Session, User } from 'lucia';

export const actions: Actions = {
  'verify-email-code': async (event) => {
    const emailVerificationForm = await superValidate(event, zod(verificationSchema));
    if (!emailVerificationForm.valid) {
      return fail(400, {
        success: false,
        message: 'Invalid code',
        emailVerificationForm
      });
    }

    const user: User | null = event.locals.user;
    if (!user) {
      return fail(400, {
        success: false,
        message: 'Invalid code',
        emailVerificationForm
      });
    }

    try {
      const isValidCode = await verifyVerificationCode({
        user: user,
        code: emailVerificationForm.data.code
      });
      if (!isValidCode) {
        return fail(400, {
          success: false,
          message: 'Invalid code',
          emailVerificationForm
        });
      }

      await lucia.invalidateUserSessions(user.id);
      await db.update(users).set({ isEmailVerified: true }).where(eq(users.id, user.id));
    } catch (err) {
      console.error(err);
      return fail(400, {
        success: false,
        message: 'Invalid code',
        emailVerificationForm
      });
    }

    const session = await lucia.createSession(user.id, { isTwoFactorVerified: false });
    const sessionCookie = lucia.createSessionCookie(session.id);
    event.cookies.set(sessionCookie.name, sessionCookie.value, {
      path: '.',
      ...sessionCookie.attributes
    });

    redirect(302, '/');
  }
};

export const load: PageServerLoad = async (event) => {
  // Don't use handleLoggedIn as we're verifying emails now
  const session: Session | null = event.locals.session;
  const user: User | null = event.locals.user;
  if (session && user) {
    if (!session.isTwoFactorVerified && user!.isTwoFactor) {
      return redirect(302, '/auth/2fa/otp');
    } else if (user?.isEmailVerified) {
      return redirect(302, '/');
    }
  }

  return {
    emailVerificationForm: await superValidate(zod(verificationSchema))
  };
};
