import type { Actions, PageServerLoad } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { db } from '$lib/db';
import { eq } from 'drizzle-orm';
import { sha256 } from 'oslo/crypto';
import { encodeHex } from 'oslo/encoding';
import { users } from '$lib/db/schema';
import { superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import { twoFactorRecoverySchema } from './schema';
import { lucia } from '$lib/auth/server';

export const actions: Actions = {
  'recover-2fa': async (event) => {
    const recoveryForm = await superValidate(event, zod(twoFactorRecoverySchema));
    if (!recoveryForm.valid) {
      return fail(400, {
        success: false,
        recoveryForm
      });
    }

    const user = event.locals.user;
    if (!user || !user.hasTwoFactor) {
      redirect(302, '/');
    }

    const twoFactorRecoveryCodeHash = encodeHex(
      await sha256(new TextEncoder().encode(recoveryForm.data.recoveryCode))
    );
    const [userInfo] = await db
      .select()
      .from(users)
      .where(eq(users.twoFactorRecoveryHash, twoFactorRecoveryCodeHash))
      .limit(1);
    if (!userInfo) {
      recoveryForm.errors.recoveryCode = ['Invalid'];
      return fail(400, {
        success: false,
        recoveryForm
      });
    }

    await db
      .update(users)
      .set({ twoFactorSecret: null, twoFactorRecoveryHash: null, hasTwoFactor: false })
      .where(eq(users.id, user.id));

    await lucia.invalidateUserSessions(user.id);
    const session = await lucia.createSession(user.id, { isTwoFactorVerified: false });
    const sessionCookie = lucia.createSessionCookie(session.id);
    event.cookies.set(sessionCookie.name, sessionCookie.value, {
      path: '.',
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
  } else if (session.isTwoFactorVerified) {
    return redirect(302, '/');
  } else if (!user.isEmailVerified) {
    return redirect(302, '/auth/email-verification');
  }
  return {
    recoveryForm: await superValidate(zod(twoFactorRecoverySchema))
  };
};
