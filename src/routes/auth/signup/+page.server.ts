import { generateIdFromEntropySize } from 'lucia';
import type { Actions } from './$types';
import { hash } from '@node-rs/argon2';
import { fail, redirect } from '@sveltejs/kit';
import { emailSchema, passwordSchema, usernameSchema } from '$lib/schema-validation';
import { db } from '$lib/db';
import { users } from '$lib/db/schema';
import { z } from 'zod';
import { lucia } from '$lib/server/auth';
import { generateEmailVerificationCode, sendVerificationCode } from '$lib/server/auth/email';

export const actions: Actions = {
	signup: async (event) => {
		const formData = await event.request.formData();
		const username = formData.get('username');
		const email = formData.get('email');
		const firstName = formData.get('firstName');
		const lastName = formData.get('lastName');
		const password = formData.get('password');

		if (!usernameSchema.safeParse(username).success) {
			return fail(400, {
				message: 'Invalid username'
			});
		} else if (!passwordSchema.safeParse(password).success) {
			return fail(400, {
				message: 'Invalid password'
			});
		} else if (!emailSchema.safeParse(email).success) {
			return fail(400, {
				message: 'Invalid email'
			});
		} else if (!z.string().min(1).safeParse(firstName) || !z.string().min(1).safeParse(lastName)) {
			return fail(400, {
				message: 'Invalid first or last name'
			});
		}

		const passwordHash = await hash(password, {
			// recommended minimum parameters
			memoryCost: 19456,
			timeCost: 2,
			outputLen: 32,
			parallelism: 1
		});
		const userId = generateIdFromEntropySize(10); // 16 characters long

		try {
			await db.insert(users).values({
				id: userId,
				firstName: firstName as string,
				lastName: lastName as string,
				username: username as string,
				email: email as string,
				passwordHash: passwordHash,
				isEmailVerified: false
			});

			const verificationCode = await generateEmailVerificationCode({
				userId: userId,
				email: email as string
			});
			await sendVerificationCode({ email: email as string, verificationCode: verificationCode });

			const session = await lucia.createSession(userId, {});
			const sessionCookie = lucia.createSessionCookie(session.id);
			event.cookies.set(sessionCookie.name, sessionCookie.value, {
				path: '.',
				...sessionCookie.attributes
			});
		} catch (err) {
			return (
				fail(400),
				{
					message: 'Email or username already used'
				}
			);
		}

		redirect(302, '/');
	}
};
