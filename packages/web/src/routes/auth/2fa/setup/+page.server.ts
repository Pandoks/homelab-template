/**
 * Create new 2FA TOTP credentials for user
 * NOTE: Should not EVER be used unless the user has NEVER initialized 2FA or is resetting their 2FA settings
 */
import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { handleAlreadyLoggedIn } from '$lib/auth/server';
import { eq } from 'drizzle-orm';
import { superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import { twoFactorSetupSchema } from './schema';
import { database } from '$lib/postgres';
import { twoFactorAuthenticationCredentials } from '@startup-template/core/database/main/schema/auth.sql';
import { decodeHex, encodeBase32LowerCase, encodeHexLowerCase } from '@oslojs/encoding';
import { createTOTPKeyURI, verifyTOTP } from '@oslojs/otp';
import { PUBLIC_APP_NAME } from '$env/static/public';

export const actions: Actions = {
  'verify-otp': async (event) => {
    handleAlreadyLoggedIn(event);
    const user = event.locals.user;
    if (!user) {
      return redirect(302, '/auth/login');
    } else if (event.locals.session?.isTwoFactorVerified || user.hasTwoFactor) {
      return redirect(302, '/');
    }

    const otpForm = await superValidate(event, zod(twoFactorSetupSchema));
    if (!otpForm.valid) {
      return fail(400, {
        success: false,
        message: 'Internal Server Error',
        otpForm
      });
    }

    const [{ twoFactorKey }] = await database
      .select({ twoFactorKey: twoFactorAuthenticationCredentials.twoFactorKey })
      .from(twoFactorAuthenticationCredentials)
      .where(eq(twoFactorAuthenticationCredentials.userId, user.id))
      .limit(1);
    if (!twoFactorKey) {
      return fail(400, {
        success: false,
        message: 'Internal Server Error',
        otpForm
      });
    }

    const isValidOtp = verifyTOTP(decodeHex(twoFactorKey), 30, 6, otpForm.data.otp);
    if (!isValidOtp) {
      return fail(400, {
        success: false,
        message: 'Invalid otp code',
        otpForm
      });
    }

    return {
      success: true,
      message: 'Success',
      otpForm
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

  let [{ twoFactorKey: twoFactorKey }] = await database
    .select({ twoFactorKey: twoFactorAuthenticationCredentials.twoFactorKey })
    .from(twoFactorAuthenticationCredentials)
    .where(eq(twoFactorAuthenticationCredentials.userId, user.id))
    .limit(1);

  if (!twoFactorKey) {
    twoFactorKey = encodeHexLowerCase(crypto.getRandomValues(new Uint8Array(20)));
    await database
      .insert(twoFactorAuthenticationCredentials)
      .values({
        userId: user.id,
        twoFactorKey: twoFactorKey,
        activated: false
      })
      .onConflictDoUpdate({
        target: twoFactorAuthenticationCredentials.userId,
        set: { twoFactorKey: twoFactorKey, activated: false }
      });
  }

  // create TOTP with app name, and user identifier (username/email)
  const decodedKey = decodeHex(twoFactorKey);
  const uri = createTOTPKeyURI(PUBLIC_APP_NAME, user.username, decodedKey, 30, 6);
  return {
    qrCodeLink: uri,
    twoFactorKey: encodeBase32LowerCase(decodedKey),
    otpForm: await superValidate(zod(twoFactorSetupSchema))
  };
};
