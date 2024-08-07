import { generateIdFromEntropySize } from 'lucia';
import type { Actions, PageServerLoad } from './$types';
import { handleAlreadyLoggedIn, lucia } from '$lib/auth/server';
import { encodeHex } from 'oslo/encoding';
import { sha256 } from 'oslo/crypto';
import { db } from '$lib/db/postgres';
import { eq } from 'drizzle-orm';
import { redirect } from '@sveltejs/kit';
import { twoFactorAuthenticationCredentials } from '$lib/db/postgres/schema/auth';

export const ssr = false;

export const actions: Actions = {
  'activate-2fa': async (event) => {
    handleAlreadyLoggedIn(event);
    const user = event.locals.user;
    if (!user) {
      return redirect(302, '/auth/login');
    } else if (event.locals.session?.isTwoFactorVerified || user.hasTwoFactor) {
      return redirect(302, '/');
    }

    const dbUpdate = db.main
      .update(twoFactorAuthenticationCredentials)
      .set({
        activated: true
      })
      .where(eq(twoFactorAuthenticationCredentials.userId, user.id));

    const sessionCreation = lucia.createSession(user.id, {
      isTwoFactorVerified: true,
      isPasskeyVerified: false
    });
    const [session] = await Promise.all([sessionCreation, dbUpdate]);
    const sessionCookie = lucia.createSessionCookie(session.id);
    event.cookies.set(sessionCookie.name, sessionCookie.value, {
      path: '/',
      ...sessionCookie.attributes
    });

    return redirect(302, '/');
  },
  'generate-new': async (event) => {
    handleAlreadyLoggedIn(event);
    const user = event.locals.user;
    if (!user) {
      return redirect(302, '/auth/login');
    } else if (event.locals.session?.isTwoFactorVerified || user.hasTwoFactor) {
      return redirect(302, '/');
    }

    const twoFactorRecoveryCode = generateIdFromEntropySize(25); // 40 characters
    const twoFactorRecoveryCodeHashBuffer = await sha256(
      new TextEncoder().encode(twoFactorRecoveryCode)
    );

    await db.main
      .update(twoFactorAuthenticationCredentials)
      .set({ twoFactorRecoveryHash: encodeHex(twoFactorRecoveryCodeHashBuffer) })
      .where(eq(twoFactorAuthenticationCredentials.userId, user.id));

    return {
      twoFactorRecoveryCode: twoFactorRecoveryCode
    };
  }
};

export const load: PageServerLoad = async (event) => {
  handleAlreadyLoggedIn(event);
  const user = event.locals.user;
  if (!user) {
    return redirect(302, '/auth/login');
  } else if (event.locals.session?.isTwoFactorVerified || user.hasTwoFactor) {
    return redirect(302, '/');
  }

  const [{ twoFactorRecoveryHash }] = await db.main
    .select({ twoFactorRecoveryHash: twoFactorAuthenticationCredentials.twoFactorRecoveryHash })
    .from(twoFactorAuthenticationCredentials)
    .where(eq(twoFactorAuthenticationCredentials.userId, user.id))
    .limit(1);
  if (twoFactorRecoveryHash) {
    // user already has recovery code (should only show them once)
    return {
      twoFactorRecoveryCode: null
    };
  }

  const twoFactorRecoveryCode = generateIdFromEntropySize(25); // 40 characters
  const twoFactorRecoveryCodeHash = encodeHex(
    await sha256(new TextEncoder().encode(twoFactorRecoveryCode))
  );

  await db.main
    .update(twoFactorAuthenticationCredentials)
    .set({ twoFactorRecoveryHash: twoFactorRecoveryCodeHash })
    .where(eq(twoFactorAuthenticationCredentials.userId, user.id));

  return {
    twoFactorRecoveryCode: twoFactorRecoveryCode
  };
};
