import { db } from '$lib/db';
import { users } from '$lib/db/schema';
import { eq } from 'drizzle-orm';
import type { Actions, PageServerLoad } from './$types';
import { createPasswordResetToken, sendPasswordReset } from '$lib/server/auth/password-reset';
import { PUBLIC_APP_HOST } from '$env/static/public';
import { superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import { passwordResetSchema } from './schema';
import { redirect } from '@sveltejs/kit';
import type { Session, User } from 'lucia';

export const actions: Actions = {
  'password-reset': async (event) => {
    const passwordResetForm = await superValidate(event, zod(passwordResetSchema));
    if (!passwordResetForm.valid) {
      return { success: false, passwordResetForm };
    }

    const email = passwordResetForm.data.email;
    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (!user) {
      return { success: true, passwordResetForm };
    }

    const verificationToken = await createPasswordResetToken({ userId: user.id });
    const verificationLink = `${PUBLIC_APP_HOST}/auth/reset-password/${verificationToken}`;

    await sendPasswordReset({ email: email, verificationLink: verificationLink });
    return { success: true, passwordResetForm };
  }
};

export const load: PageServerLoad = async () => {
  return {
    passwordResetForm: await superValidate(zod(passwordResetSchema))
  };
};
