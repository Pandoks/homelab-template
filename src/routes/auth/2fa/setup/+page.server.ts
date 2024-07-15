/**
 * Create new 2FA TOTP credentials for user
 * NOTE: Should not EVER be used unless the user has NEVER initialized 2FA or is resetting their 2FA settings
 */
import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from '../$types';
import { handleLoggedIn } from '$lib/server/auth';
import { db } from '$lib/db';
import { users } from '$lib/db/schema';
import { base32, decodeHex, encodeHex } from 'oslo/encoding';
import { createTOTPKeyURI, TOTPController } from 'oslo/otp';
import { PUBLIC_APP_NAME } from '$env/static/public';
import { eq } from 'drizzle-orm';
import { generateIdFromEntropySize, type User } from 'lucia';
import { sha256 } from 'oslo/crypto';
import { superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import { twoFactorSetupSchema } from './schema';

export const actions: Actions = {
  'verify-otp': async (event) => {
    const otpForm = await superValidate(event, zod(twoFactorSetupSchema));
    return {
      success: true,
      message: 'Success',
      otpForm
    };
    if (!otpForm.valid) {
      return fail(400, {
        success: false,
        message: 'Invalid otp code',
        otpForm
      });
    }

    const user: User | null = event.locals.user;
    if (!user) {
      return fail(400, {
        success: false,
        message: 'Invalid otp code',
        otpForm
      });
    }

    const [userInfo] = await db.select().from(users).where(eq(users.id, user.id)).limit(1);
    if (!userInfo || !userInfo.twoFactorSecret) {
      return fail(400, {
        success: false,
        message: 'Internal server error',
        otpForm
      });
    }
    const isValidOtp = await new TOTPController().verify(
      otpForm.data.otp,
      decodeHex(userInfo.twoFactorSecret)
    );
    if (!isValidOtp) {
      return fail(400, {
        success: false,
        message: 'Invalid otp code',
        otpForm
      });
    }

    await db.update(users).set({ hasTwoFactor: true }).where(eq(users.id, user.id));
    return {
      success: true,
      message: 'Success',
      otpForm
    };
  }
};

export const load: PageServerLoad = async (event) => {
  handleLoggedIn(event);

  const twoFactorSecret = crypto.getRandomValues(new Uint8Array(20));
  const twoFactorRecoveryCode = generateIdFromEntropySize(25); // 40 characters
  const twoFactorRecoveryCodeHash = encodeHex(
    await sha256(new TextEncoder().encode(twoFactorRecoveryCode))
  );
  await db.update(users).set({
    twoFactorSecret: encodeHex(twoFactorSecret),
    twoFactorRecoveryHash: twoFactorRecoveryCodeHash
  });

  // create TOTP with app name, and user identifier (username/email)
  const uri = createTOTPKeyURI(PUBLIC_APP_NAME, event.locals.user.username, twoFactorSecret);
  return {
    qrCodeLink: uri,
    twoFactorSecret: base32.encode(twoFactorSecret),
    recoveryCode: twoFactorRecoveryCode,
    otpForm: await superValidate(zod(twoFactorSetupSchema))
  };
};
