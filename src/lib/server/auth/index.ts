import { Lucia } from 'lucia';
import { dev } from '$app/environment';
import { db } from '$lib/db';
import { users } from '$lib/db/schema';
import { sessions } from '$lib/db/schema/auth';
import { DrizzlePostgreSQLAdapter } from '@lucia-auth/adapter-drizzle';

const adapter = new DrizzlePostgreSQLAdapter(db, sessions, users);

export const lucia = new Lucia(adapter, {
	sessionCookie: {
		attributes: {
			secure: !dev // sets `Secure` flag in HTTPS
		}
	},
	getUserAttributes: (attributes) => {
		return {
			username: attributes.username,
			email: attributes.email,
			isEmailVerified: attributes.isEmailVerified,
			isTwoFactor: attributes.twoFactorSecret !== null
		};
	}
});

// gives lucia's module types
declare module 'lucia' {
	interface Register {
		Lucia: typeof lucia;
		DatabaseUserAttributes: DatabaseUserAttributes;
	}
}

// attributes of user for auth from the database
interface DatabaseUserAttributes {
	username: string;
	email: string;
	isEmailVerified: boolean;
	twoFactorSecret: string | null;
}
