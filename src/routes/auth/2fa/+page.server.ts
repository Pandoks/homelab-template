/**
 * Create new 2FA TOTP credentials for user
 * Should not EVER be used unless the user has NEVER initialized 2FA or is resetting their 2FA settings
 */
import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { lucia } from '$lib/server/auth';
import { db } from '$lib/db';
import { users } from '$lib/db/schema';
import { decodeHex, encodeHex } from 'oslo/encoding';
import { createTOTPKeyURI, TOTPController } from 'oslo/otp';
import { PUBLIC_APP_NAME } from '$env/static/public';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { generateIdFromEntropySize } from 'lucia';
import { sha256 } from 'oslo/crypto';
import { TextEncoderStream } from 'stream/web';

export const actions: Actions = {
	'verify-otp': async (event) => {
		const formData = await event.request.formData();
		const otp = formData.get('otp');
		if (!z.string().length(6).safeParse(otp).success) {
			return fail(400, {
				message: 'Invalid otp code'
			});
		}
		const { user } = await lucia.validateSession(event.locals.session.id);
		if (!user) {
			return fail(400, {
				message: 'Invalid otp code'
			});
		}

		const [userInfo] = await db.select().from(users).where(eq(users.id, user.id)).limit(1);
		if (!userInfo || !userInfo.twoFactorSecret) {
			return fail(400, {
				message: 'Invalid otp code'
			});
		}
		const validOTP = await new TOTPController().verify(
			otp as string,
			decodeHex(userInfo.twoFactorSecret)
		);
		if (validOTP) {
			redirect(302, '/');
		}

		return fail(400, {
			message: 'Invalid otp code'
		});
	}
};
export const load: PageServerLoad = async (event) => {
	const { user } = await lucia.validateSession(event.locals.session.id);
	if (!user || user.isTwoFactor) redirect(302, '/');

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
	const uri = createTOTPKeyURI(PUBLIC_APP_NAME, user.username, twoFactorSecret);
	return {
		username: user.username,
		qrCodeLink: uri,
		recoveryCode: twoFactorRecoveryCode
	};
};
