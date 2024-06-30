import { db } from '$lib/db';
import { users } from '$lib/db/schema';
import { emailSchema } from '$lib/schema-validation';
import { eq } from 'drizzle-orm';
import type { Actions } from './$types';

export const actions: Actions = {
	'password-reset': async (event) => {
		const formData = await event.request.formData();
		const email = formData.get('email');
		if (!emailSchema.safeParse(email).success) {
			// Don't want to disclode valid emails
			return { success: true };
		}

		const [user] = await db
			.select()
			.from(users)
			.where(eq(users.email, email as string))
			.limit(1);
		if (!user) {
			return { success: true };
		}
	}
};
