/**
 * Create new 2FA TOTP credentials for user
 * NOTE: Should not EVER be used unless the user has NEVER initialized 2FA or is resetting their 2FA settings
 */
import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { handleAlreadyLoggedIn } from '$lib/auth/server';
import { base32, decodeHex, encodeHex } from 'oslo/encoding';
import { createTOTPKeyURI, TOTPController } from 'oslo/otp';
import { PUBLIC_APP_NAME } from '$env/static/public';
import { eq } from 'drizzle-orm';
import { TimeSpan } from 'lucia';
import { superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import { twoFactorSetupSchema } from './schema';
import { database as mainDatabase } from '@startup-template/core/database/main/index';
import { twoFactorAuthenticationCredentials } from '@startup-template/core/database/main/schema/auth.sql';

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

    const [{ twoFactorSecret }] = await mainDatabase
      .select({ twoFactorSecret: twoFactorAuthenticationCredentials.twoFactorSecret })
      .from(twoFactorAuthenticationCredentials)
      .where(eq(twoFactorAuthenticationCredentials.userId, user.id))
      .limit(1);
    if (!twoFactorSecret) {
      return fail(400, {
        success: false,
        message: 'Internal Server Error',
        otpForm
      });
    }

    const isValidOtp = await new TOTPController().verify(
      otpForm.data.otp,
      decodeHex(twoFactorSecret)
    );
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

  let [{ twoFactorSecret }] = await mainDatabase
    .select({ twoFactorSecret: twoFactorAuthenticationCredentials.twoFactorSecret })
    .from(twoFactorAuthenticationCredentials)
    .where(eq(twoFactorAuthenticationCredentials.userId, user.id))
    .limit(1);

  if (!twoFactorSecret) {
    twoFactorSecret = encodeHex(crypto.getRandomValues(new Uint8Array(20)));
    await mainDatabase
      .insert(twoFactorAuthenticationCredentials)
      .values({
        userId: user.id,
        twoFactorSecret: twoFactorSecret,
        activated: false
      })
      .onConflictDoUpdate({
        target: twoFactorAuthenticationCredentials.userId,
        set: { twoFactorSecret: twoFactorSecret, activated: false }
      });
  }

  // create TOTP with app name, and user identifier (username/email)
  const decodedSecret = decodeHex(twoFactorSecret);
  const uri = createTOTPKeyURI(PUBLIC_APP_NAME, user.username, decodedSecret, {
    period: new TimeSpan(30, 's')
  });
  return {
    qrCodeLink: uri,
    twoFactorSecret: base32.encode(decodedSecret),
    otpForm: await superValidate(zod(twoFactorSetupSchema))
  };
};
