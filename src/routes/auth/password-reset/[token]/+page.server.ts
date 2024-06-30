import { passwordSchema } from '$lib/schema-validation';
import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { encodeHex } from 'oslo/encoding';
import { sha256 } from 'oslo/crypto';
import { db } from '$lib/db';
import { passwordResetTokens } from '$lib/db/schema/auth';
import { eq } from 'drizzle-orm';
import { isWithinExpirationDate } from 'oslo';
import { lucia } from '$lib/server/auth';
import { hash } from '@node-rs/argon2';
import { users } from '$lib/db/schema';

export const actions: Actions = {
	'password-reset': async (event) => {
		const formData = await event.request.formData();
		const password = formData.get('password');
		if (!passwordSchema.safeParse(password).success) {
			return fail(400, { message: 'Invalid password format' });
		}

		const passwordResetToken = event.params.token;
		const passwordResetTokenHash = encodeHex(
			await sha256(new TextEncoder().encode(passwordResetToken))
		);
		const [token] = await db
			.select()
			.from(passwordResetTokens)
			.where(eq(passwordResetTokens.tokenHash, passwordResetTokenHash))
			.limit(1);
		if (token) {
			await db
				.delete(passwordResetTokens)
				.where(eq(passwordResetTokens.tokenHash, passwordResetTokenHash));
		}
		if (!token || !isWithinExpirationDate(token.expiresAt)) {
			return fail(400);
		}

		await lucia.invalidateUserSessions(token.userId);
		const passwordHash = await hash(password as string, {
			memoryCost: 19456,
			timeCost: 2,
			outputLen: 32,
			parallelism: 1
		});
		await db.update(users).set({ passwordHash: passwordHash }).where(eq(users.id, token.userId));

		const session = await lucia.createSession(token.userId, {});
		const sessionCookie = lucia.createSessionCookie(session.id);
		event.cookies.set(sessionCookie.name, sessionCookie.value, {
			path: '.',
			...sessionCookie.attributes
		});
		event.setHeaders({
			'Referrer-Policy': 'strict-origin' // see load function
		});

		redirect(302, '/');
	}
};

export const load: PageServerLoad = async (event) => {
	// Hides the entire URL when making a request to the website from unsafe environments
	// Used when you have sensitive information in the URL that you don't want to be stolen
	event.setHeaders({
		'Referrer-Policy': 'strict-origin'
	});
	return {};
};
