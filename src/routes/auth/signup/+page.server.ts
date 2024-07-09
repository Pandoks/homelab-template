import { generateIdFromEntropySize, type Session, type User } from 'lucia';
import type { Actions, PageServerLoad } from './$types';
import { hash } from '@node-rs/argon2';
import { fail, redirect } from '@sveltejs/kit';
import { db } from '$lib/db';
import { users } from '$lib/db/schema';
import { lucia } from '$lib/server/auth';
import { generateEmailVerificationCode, sendVerificationCode } from '$lib/server/auth/email';
import { superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import { signupSchema } from './schema';

export const actions: Actions = {
  signup: async (event) => {
    const signupForm = await superValidate(event, zod(signupSchema));
    if (!signupForm.valid) {
      return fail(400, {
        success: false,
        message: '',
        signupForm
      });
    }

    const passwordHash = await hash(signupForm.data.password, {
      // recommended minimum parameters
      memoryCost: 19456,
      timeCost: 2,
      outputLen: 32,
      parallelism: 1
    });
    const userId = generateIdFromEntropySize(10); // 16 characters long
    const email = signupForm.data.email;

    try {
      await db.insert(users).values({
        id: userId,
        username: signupForm.data.username,
        email: email,
        passwordHash: passwordHash,
        isEmailVerified: false,
        twoFactorSecret: null,
        twoFactorRecoveryHash: null
      });

      const verificationCode = await generateEmailVerificationCode({
        userId: userId,
        email: email
      });
      await sendVerificationCode({ email: email, verificationCode: verificationCode });

      const session = await lucia.createSession(userId, { isTwoFactorVerified: false });
      const sessionCookie = lucia.createSessionCookie(session.id);
      event.cookies.set(sessionCookie.name, sessionCookie.value, {
        path: '.',
        ...sessionCookie.attributes
      });
    } catch (err) {
      return fail(400, { success: false, message: 'Internal server error', signupForm });
    }

    return redirect(302, '/');
  }
};

export const load: PageServerLoad = async (event) => {
  const session: Session | null = event.locals.session;
  const user: User | null = event.locals.user;
  if (session) {
    if (!session.isTwoFactorVerified && user!.isTwoFactor) {
      return redirect(302, '/auth/2fa/otp');
    } else {
      return redirect(302, '/');
    }
  }

  return {
    signupForm: await superValidate(zod(signupSchema))
  };
};
