import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { encodeHex } from 'oslo/encoding';
import { sha256 } from 'oslo/crypto';
import { db } from '$lib/db/server/postgres';
import { passwordResets, twoFactorAuthenticationCredentials } from '$lib/db/postgres/schema/auth';
import { eq } from 'drizzle-orm';
import { isWithinExpirationDate } from 'oslo';
import { lucia, handleAlreadyLoggedIn, verifyPasswordStrength } from '$lib/auth/server';
import { hash } from '@node-rs/argon2';
import { emails, users } from '$lib/db/postgres/schema';
import { superValidate } from 'sveltekit-superforms';
import { newPasswordSchema } from './schema';
import { zod } from 'sveltekit-superforms/adapters';

export const actions: Actions = {
  'new-password': async (event) => {
    handleAlreadyLoggedIn(event);
    if (event.locals.session) {
      return redirect(302, '/');
    }

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
    const [token] = await db.main
      .select({
        expiresAt: passwordResets.expiresAt,
        userId: passwordResets.userId
      })
      .from(passwordResets)
      .where(eq(passwordResets.tokenHash, passwordResetTokenHash))
      .limit(1);
    if (token) {
      await db.main
        .delete(passwordResets)
        .where(eq(passwordResets.tokenHash, passwordResetTokenHash));
    }
    if (!token || !isWithinExpirationDate(token.expiresAt)) {
      return fail(400, {
        success: false,
        message: 'Password reset link has expired',
        newPasswordForm
      });
    }

    const sessionInvalidation = lucia.invalidateUserSessions(token.userId);

    const password = newPasswordForm.data.password;
    const passwordCheck = verifyPasswordStrength(password);
    const [strongPassword] = await Promise.all([passwordCheck, sessionInvalidation]);
    if (!strongPassword) {
      newPasswordForm.errors.password = ['Weak password'];
      return fail(400, {
        success: false,
        message: 'Password found in compromised databases',
        newPasswordForm
      });
    }

    const passwordHash = await hash(password, {
      memoryCost: 19456,
      timeCost: 2,
      outputLen: 32,
      parallelism: 1
    });
    const updateUser = db.main
      .update(users)
      .set({ passwordHash: passwordHash })
      .where(eq(users.id, token.userId));
    const sessionCreation = lucia.createSession(token.userId, {
      isTwoFactorVerified: false,
      isPasskeyVerified: false
    });
    const getUserInfo = db.main
      .select({
        isEmailVerified: emails.isVerified,
        twoFactorSecret: twoFactorAuthenticationCredentials.twoFactorSecret
      })
      .from(emails)
      .innerJoin(
        twoFactorAuthenticationCredentials,
        eq(twoFactorAuthenticationCredentials.userId, emails.userId)
      )
      .where(eq(emails.userId, token.userId))
      .limit(1);
    const [[user], session] = await Promise.all([getUserInfo, sessionCreation, updateUser]);
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
      return redirect(302, '/auth/2fa/otp');
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

  const formValidation = superValidate(zod(newPasswordSchema));

  // Check if the token is valid let the user know
  const passwordResetToken = event.params.token;
  const passwordResetTokenHash = encodeHex(
    await sha256(new TextEncoder().encode(passwordResetToken))
  );
  const tokenQuery = db.main
    .select({ expiresAt: passwordResets.expiresAt })
    .from(passwordResets)
    .where(eq(passwordResets.tokenHash, passwordResetTokenHash))
    .limit(1);

  const [newPasswordForm, [token]] = await Promise.all([formValidation, tokenQuery]);
  if (!token) {
    return {
      success: false,
      message: 'Password reset link has expired',
      newPasswordForm
    };
  } else if (!isWithinExpirationDate(token.expiresAt)) {
    await db.main.delete(passwordResets).where(eq(passwordResets.tokenHash, passwordResetToken));
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
