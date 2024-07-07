import { db } from '$lib/db';
import { users } from '$lib/db/schema';
import { eq } from 'drizzle-orm';
import type { Actions, PageServerLoad } from './$types';
import { createPasswordResetToken, sendPasswordResetToken } from '$lib/server/auth/password-reset';
import { PUBLIC_APP_HOST } from '$env/static/public';
import { superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import { passwordResetSchema } from './schema';
import { lucia } from '$lib/server/auth';
import { redirect } from '@sveltejs/kit';

export const actions: Actions = {
  'password-reset': async (event) => {
    const passwordResetForm = await superValidate(event, zod(passwordResetSchema));
    if (!passwordResetForm.valid) {
      return { success: false, passwordResetForm };
    }

    const email = passwordResetForm.data.email;
    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (!user) {
      return { success: true, passwordResetForm };
    }

    const verificationToken = await createPasswordResetToken({ userId: user.id });
    const verificationLink = `${PUBLIC_APP_HOST}/auth/reset-password/${verificationToken}`;

    await sendPasswordResetToken({ email: email, verificationLink: verificationLink });
    return { success: true, passwordResetForm };
  }
};

export const load: PageServerLoad = async (event) => {
  const existingSession = event.locals.session;

  if (!existingSession) {
    // user isn't logged in
    return {
      passwordResetForm: await superValidate(zod(passwordResetSchema))
    };
  }

  const { session, user } = await lucia.validateSession(existingSession.id);
  if (!session) {
    // reset current cookie/session
    const sessionCookie = lucia.createBlankSessionCookie();
    event.cookies.set(sessionCookie.name, sessionCookie.value, {
      path: '.',
      ...sessionCookie.attributes
    });

    return {
      passwordResetForm: await superValidate(zod(passwordResetSchema))
    };
  }

  if (!session.isTwoFactorVerified && user.isTwoFactor) {
    return redirect(302, '/auth/otp');
  }
  return redirect(302, '/');
};
