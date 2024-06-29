import { fail, redirect } from '@sveltejs/kit';
import type { Actions } from './$types';
import { verify } from '@node-rs/argon2';
import { lucia } from '$lib/server/auth';
import { emailSchema, passwordSchema, usernameSchema } from '$lib/schema-validation';
import { db } from '$lib/db';
import { users, type User } from '$lib/db/schema';
import { eq } from 'drizzle-orm';

export const actions: Actions = {
	login: async (event) => {
		const formData = await event.request.formData();
		const usernameOrEmail = formData.get('username/email');
		const password = formData.get('password');

		let isUsername = true;
		if (emailSchema.safeParse(usernameOrEmail).success) {
			isUsername = false;
		} else if (
			!usernameSchema.safeParse(usernameOrEmail).success ||
			!passwordSchema.safeParse(password).success
		) {
			return fail(400, {
				message: 'Invalid login credentials'
			});
		}

		// TODO: get exinsting user
		let user: User | null = null;
		if (isUsername) {
			[user] = await db
				.select()
				.from(users)
				.where(eq(users.username, usernameOrEmail as string))
				.limit(1);
		} else {
			[user] = await db
				.select()
				.from(users)
				.where(eq(users.email, usernameOrEmail as string))
				.limit(1);
		}

		const validPassword = await verify(user.passwordHash, password, {
			memoryCost: 19456,
			timeCost: 2,
			outputLen: 32,
			parallelism: 1
		});
		if (!user || !validPassword) {
			return fail(400, {
				message: 'Incorrect login credentials'
			});
		}

		const session = await lucia.createSession(user.id, {});
		const sessionCookie = lucia.createSessionCookie(session.id);
		event.cookies.set(sessionCookie.name, sessionCookie.value, {
			path: '.',
			...sessionCookie.attributes
		});

		redirect(302, '/');
	}
};
