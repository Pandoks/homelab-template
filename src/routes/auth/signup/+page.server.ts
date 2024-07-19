import { generateIdFromEntropySize } from 'lucia';
import type { Actions, PageServerLoad } from './$types';
import { hash } from '@node-rs/argon2';
import { fail, redirect } from '@sveltejs/kit';
import { db } from '$lib/db';
import { users } from '$lib/db/schema';
import { handleAlreadyLoggedIn, lucia } from '$lib/auth/server';
import { generateEmailVerification, sendVerification } from '$lib/auth/server/email';
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
        hasTwoFactor: false,
        twoFactorSecret: null,
        twoFactorRecoveryHash: null
      });

      const verificationCode = await generateEmailVerification({
        userId: userId,
        email: email
      });
      await sendVerification({ email: email, code: verificationCode });

      const session = await lucia.createSession(userId, { isTwoFactorVerified: false });
      const sessionCookie = lucia.createSessionCookie(session.id);
      event.cookies.set(sessionCookie.name, sessionCookie.value, {
        path: '.',
        ...sessionCookie.attributes
      });
    } catch (err) {
      console.log(err);
      // @ts-ignore
      if (err!.code) {
        // @ts-ignore
        const constraint_name = err!.constraint_name;
        if (constraint_name === 'users_username_unique') {
          signupForm.errors.username = ['Username already exists'];
          return fail(400, {
            success: false,
            message: 'Username already exists',
            signupForm
          });
        } else if (constraint_name === 'users_email_unique') {
          signupForm.errors.email = ['Email already exists'];
          return fail(400, {
            success: false,
            message: 'Email already exists',
            signupForm
          });
        }
      }

      return fail(400, {
        success: false,
        message: 'Internal Server Error',
        signupForm
      });
    }

    return redirect(302, '/auth/email-verification');
  }
};

export const load: PageServerLoad = async (event) => {
  handleAlreadyLoggedIn(event);
  if (event.locals.session) {
    return redirect(302, '/');
  }

  return {
    signupForm: await superValidate(zod(signupSchema))
  };
};
