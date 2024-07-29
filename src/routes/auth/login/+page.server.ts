import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { verify } from '@node-rs/argon2';
import { handleAlreadyLoggedIn, lucia } from '$lib/auth/server';
import { db } from '$lib/db/postgres';
import { users, type User as DbUser } from '$lib/db/postgres/schema';
import { eq } from 'drizzle-orm';
import { superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import { loginPasskeySchema, loginSchema } from './schema';
import { emailSchema } from '../schema';

export const actions: Actions = {
  login: async (event) => {
    const loginForm = await superValidate(event, zod(loginSchema));
    if (!loginForm.valid) {
      return fail(400, {
        success: false,
        loginForm
      });
    }

    let isUsername = true;
    const usernameOrEmail = loginForm.data.usernameOrEmail;
    if (!emailSchema.safeParse(usernameOrEmail).success) {
      isUsername = false;
    }

    let user: DbUser | null = null;
    if (isUsername) {
      [user] = await db.select().from(users).where(eq(users.username, usernameOrEmail)).limit(1);
    } else {
      [user] = await db.select().from(users).where(eq(users.email, usernameOrEmail)).limit(1);
    }

    let validPassword = false;
    if (user && user.passwordHash) {
      validPassword = await verify(user.passwordHash, loginForm.data.password, {
        memoryCost: 19456,
        timeCost: 2,
        outputLen: 32,
        parallelism: 1
      });
    }
    // NOTE: don't return incorrect user before hashing the password as it gives information to hackers
    if (!user || !validPassword) {
      return fail(400, {
        success: false,
        loginForm
      });
    }

    const session = await lucia.createSession(user.id, {
      isTwoFactorVerified: false,
      isPasskeyVerified: false
    });
    const sessionCookie = lucia.createSessionCookie(session.id);
    event.cookies.set(sessionCookie.name, sessionCookie.value, {
      path: '/',
      ...sessionCookie.attributes
    });

    if (!user.isEmailVerified) {
      return redirect(302, '/auth/email-verification');
    } else if (user.twoFactorSecret) {
      return redirect(302, '/auth/otp');
    }

    return redirect(302, '/');
  }
};

export const load: PageServerLoad = async (event) => {
  handleAlreadyLoggedIn(event);
  if (event.locals.session) {
    return redirect(302, '/');
  }

  return {
    loginForm: await superValidate(zod(loginSchema)),
    loginPasskeyForm: await superValidate(zod(loginPasskeySchema))
  };
};
