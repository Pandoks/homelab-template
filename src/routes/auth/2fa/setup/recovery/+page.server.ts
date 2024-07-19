import { generateIdFromEntropySize } from 'lucia';
import type { Actions, PageServerLoad } from './$types';
import { handleLoggedIn, lucia } from '$lib/server/auth';
import { encodeHex } from 'oslo/encoding';
import { sha256 } from 'oslo/crypto';
import { db } from '$lib/db';
import { users } from '$lib/db/schema';
import { eq } from 'drizzle-orm';
import { redirect } from '@sveltejs/kit';

export const actions: Actions = {
  'activate-2fa': async (event) => {
    const user = event.locals.user;
    if (!user) {
      return redirect(302, '/auth/login');
    }

    try {
      await db.update(users).set({ hasTwoFactor: true }).where(eq(users.id, user.id));
    } catch (err) {
      return {
        success: false
      };
    }

    const session = await lucia.createSession(user.id, { isTwoFactorVerified: true });
    const sessionCookie = lucia.createSessionCookie(session.id);
    event.cookies.set(sessionCookie.name, sessionCookie.value, {
      path: '.',
      ...sessionCookie.attributes
    });

    return redirect(302, '/');
  }
};

export const load: PageServerLoad = async (event) => {
  handleLoggedIn(event);
  const user = event.locals.user;
  if (!user) {
    return redirect(302, '/auth/login');
  }

  const twoFactorRecoveryCode = generateIdFromEntropySize(25); // 40 characters
  const twoFactorRecoveryCodeHash = encodeHex(
    await sha256(new TextEncoder().encode(twoFactorRecoveryCode))
  );

  await db
    .update(users)
    // .set({ twoFactorRecoveryHash: twoFactorRecoveryCodeHash, hasTwoFactor: true })
    .set({ twoFactorRecoveryHash: twoFactorRecoveryCodeHash, hasTwoFactor: false })
    .where(eq(users.id, user.id));

  return {
    twoFactorRecoveryCode: twoFactorRecoveryCode
  };
};
