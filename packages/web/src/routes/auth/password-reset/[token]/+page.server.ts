import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { encodeHex } from 'oslo/encoding';
import { sha256 } from 'oslo/crypto';
import { eq } from 'drizzle-orm';
import { isWithinExpirationDate } from 'oslo';
import { hash } from '@node-rs/argon2';
import { superValidate } from 'sveltekit-superforms';
import { newPasswordSchema } from './schema';
import { zod } from 'sveltekit-superforms/adapters';
import { handleAlreadyLoggedIn } from '$lib/auth/server';
import { database as mainDatabase } from '@startup-template/core/database/main/index';
import { passwordResets } from '@startup-template/core/database/main/schema/auth.sql';
import { lucia, verifyPasswordStrength } from '@startup-template/core/auth/server/index';
import { users } from '@startup-template/core/database/main/schema/user.sql';

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
    const [token] = await mainDatabase
      .select({
        expiresAt: passwordResets.expiresAt,
        userId: passwordResets.userId
      })
      .from(passwordResets)
      .where(eq(passwordResets.tokenHash, passwordResetTokenHash))
      .limit(1);
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
    await mainDatabase.transaction(async (tsx) => {
      await tsx.delete(passwordResets).where(eq(passwordResets.tokenHash, passwordResetTokenHash));
      await tsx.update(users).set({ passwordHash: passwordHash }).where(eq(users.id, token.userId));
    });
    const sessionCookie = lucia.createBlankSessionCookie();
    event.cookies.set(sessionCookie.name, sessionCookie.value, {
      path: '/',
      ...sessionCookie.attributes
    });
    event.setHeaders({
      'Referrer-Policy': 'strict-origin' // see why in load function
    });

    return redirect(302, '/auth/login');
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
  const tokenQuery = mainDatabase
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
    await mainDatabase
      .delete(passwordResets)
      .where(eq(passwordResets.tokenHash, passwordResetToken));
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
