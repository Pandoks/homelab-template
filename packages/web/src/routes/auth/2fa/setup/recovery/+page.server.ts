import type { Actions, PageServerLoad } from './$types';
import { eq } from 'drizzle-orm';
import { redirect } from '@sveltejs/kit';
import { handleAlreadyLoggedIn } from '$lib/auth/server';
import { database as mainDatabase } from '@startup-template/core/database/main/index';
import { twoFactorAuthenticationCredentials } from '@startup-template/core/database/main/schema/auth.sql';
import { setSessionTokenCookie } from '$lib/auth/server/sessions';
import { createSession, generateSessionToken } from '@startup-template/core/auth/server/index';
import { encodeBase32LowerCaseNoPadding, encodeHexLowerCase } from '@oslojs/encoding';
import { sha256 } from '@oslojs/crypto/sha2';

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

    const dbUpdate = mainDatabase
      .update(twoFactorAuthenticationCredentials)
      .set({
        activated: true
      })
      .where(eq(twoFactorAuthenticationCredentials.userId, user.id));

    const sessionToken = generateSessionToken();
    const sessionCreation = createSession({
      sessionToken,
      userId: user.id,
      isTwoFactorVerified: true,
      isPasskeyVerified: false
    });
    const [session] = await Promise.all([sessionCreation, dbUpdate]);
    setSessionTokenCookie({
      event,
      sessionToken,
      expiresAt: session.expiresAt
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

    const twoFactorRecoveryCode = encodeBase32LowerCaseNoPadding(
      crypto.getRandomValues(new Uint8Array(25))
    ); // 40 characters
    const twoFactorRecoveryCodeHashBuffer = sha256(new TextEncoder().encode(twoFactorRecoveryCode));

    await mainDatabase
      .update(twoFactorAuthenticationCredentials)
      .set({ twoFactorRecoveryHash: encodeHexLowerCase(twoFactorRecoveryCodeHashBuffer) })
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

  const [{ twoFactorRecoveryHash }] = await mainDatabase
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

  const twoFactorRecoveryCode = encodeBase32LowerCaseNoPadding(
    crypto.getRandomValues(new Uint8Array(25))
  ); // 40 characters
  // 40 characters
  const twoFactorRecoveryCodeHash = encodeHexLowerCase(
    sha256(new TextEncoder().encode(twoFactorRecoveryCode))
  );

  await mainDatabase
    .update(twoFactorAuthenticationCredentials)
    .set({ twoFactorRecoveryHash: twoFactorRecoveryCodeHash })
    .where(eq(twoFactorAuthenticationCredentials.userId, user.id));

  return {
    twoFactorRecoveryCode: twoFactorRecoveryCode
  };
};
