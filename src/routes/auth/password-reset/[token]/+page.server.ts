import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { encodeHex } from 'oslo/encoding';
import { sha256 } from 'oslo/crypto';
import { db } from '$lib/db';
import { passwordResets } from '$lib/db/schema/auth';
import { eq } from 'drizzle-orm';
import { isWithinExpirationDate } from 'oslo';
import { lucia, handleAlreadyLoggedIn } from '$lib/auth/server';
import { hash } from '@node-rs/argon2';
import { users } from '$lib/db/schema';
import { superValidate } from 'sveltekit-superforms';
import { newPasswordSchema } from './schema';
import { zod } from 'sveltekit-superforms/adapters';

export const actions: Actions = {
  'new-password': async (event) => {
    const newPasswordForm = await superValidate(event, zod(newPasswordSchema));
    if (!newPasswordForm.valid) {
      return fail(400, {
        success: false,
        message: '',
        newPasswordForm
      });
    }

    const passwordResetToken = event.params.token;
    const passwordResetTokenHash = encodeHex(
      await sha256(new TextEncoder().encode(passwordResetToken))
    );
    const [token] = await db
      .select()
      .from(passwordResets)
      .where(eq(passwordResets.tokenHash, passwordResetTokenHash))
      .limit(1);
    if (token) {
      await db.delete(passwordResets).where(eq(passwordResets.tokenHash, passwordResetTokenHash));
    }
    if (!token || !isWithinExpirationDate(token.expiresAt)) {
      return fail(400, {
        success: false,
        message: 'Password reset link has expired',
        newPasswordForm
      });
    }

    await lucia.invalidateUserSessions(token.userId);
    const passwordHash = await hash(newPasswordForm.data.password, {
      memoryCost: 19456,
      timeCost: 2,
      outputLen: 32,
      parallelism: 1
    });
    await db.update(users).set({ passwordHash: passwordHash }).where(eq(users.id, token.userId));
    const [user] = await db.select().from(users).where(eq(users.id, token.userId)).limit(1);

    const session = await lucia.createSession(token.userId, { isTwoFactorVerified: false });
    const sessionCookie = lucia.createSessionCookie(session.id);
    event.cookies.set(sessionCookie.name, sessionCookie.value, {
      path: '/',
      ...sessionCookie.attributes
    });
    event.setHeaders({
      'Referrer-Policy': 'strict-origin' // see why in load function
    });

    if (!user.isEmailVerified) {
      return redirect(302, '/auth/email-verification');
    } else if (user.twoFactorSecret) {
      return redirect(302, '/auth/otp');
    }

    return redirect(302, '/');
  }
};

export const load: PageServerLoad = async (event) => {
  handleAlreadyLoggedIn(event);
  if (event.locals.session) {
    return redirect(302, '/');
  }

  // Hides the entire URL when making a request to the website from unsafe environments
  // Used when you have sensitive information in the URL that you don't want to be stolen
  event.setHeaders({
    'Referrer-Policy': 'strict-origin'
  });

  const newPasswordForm = await superValidate(zod(newPasswordSchema));

  // Check if the token is valid let the user know
  const passwordResetToken = event.params.token;
  const passwordResetTokenHash = encodeHex(
    await sha256(new TextEncoder().encode(passwordResetToken))
  );
  const [token] = await db
    .select()
    .from(passwordResets)
    .where(eq(passwordResets.tokenHash, passwordResetTokenHash))
    .limit(1);
  if (!token) {
    return {
      success: false,
      message: 'Password reset link has expired',
      newPasswordForm
    };
  } else if (!isWithinExpirationDate(token.expiresAt)) {
    await db.delete(passwordResets).where(eq(passwordResets.tokenHash, passwordResetToken));
    return {
      success: false,
      message: 'Password reset link has expired',
      newPasswordForm
    };
  }

  return {
    success: true,
    message: '',
    newPasswordForm
  };
};
