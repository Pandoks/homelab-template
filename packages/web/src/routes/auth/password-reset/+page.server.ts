import { eq } from 'drizzle-orm';
import type { Actions, PageServerLoad } from './$types';
import { superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import { passwordResetSchema } from './schema';
import { handleAlreadyLoggedIn } from '$lib/auth/server';
import { fail, redirect } from '@sveltejs/kit';
import type { RedisClientType } from 'redis';
import { building } from '$app/environment';
import { ConstantRefillTokenBucketLimiter } from '@startup-template/core/rate-limit/index';
import { redis as mainRedis } from '@startup-template/core/redis/main/index';
import { database as mainDatabase } from '@startup-template/core/database/main/index';
import { emails } from '@startup-template/core/database/main/schema/user.sql';
import {
  createPasswordResetToken,
  sendPasswordReset
} from '@startup-template/core/auth/server/password-reset';
import { PUBLIC_ORIGIN } from '$env/static/public';

const bucket = !building
  ? new ConstantRefillTokenBucketLimiter({
      name: 'password-reset-request',
      max: 3,
      refillIntervalSeconds: 30,
      storage: mainRedis as RedisClientType
    })
  : undefined;

export const actions: Actions = {
  'password-reset': async (event) => {
    handleAlreadyLoggedIn(event);
    if (event.locals.session) {
      return redirect(302, '/');
    }

    const passwordResetForm = await superValidate(event, zod(passwordResetSchema));
    if (!passwordResetForm.valid) {
      return fail(400, {
        success: false,
        throttled: false,
        passwordResetForm: passwordResetForm
      });
    }

    const email = passwordResetForm.data.email.toLowerCase();
    const [emailInfo] = await mainDatabase
      .select({ email: emails.email, userId: emails.userId })
      .from(emails)
      .where(eq(emails.email, email))
      .limit(1);
    if (!emailInfo) {
      return {
        success: true,
        throttled: false,
        passwordResetForm: passwordResetForm
      };
    }

    if (!(await bucket?.check({ key: email, cost: 1 }))) {
      return fail(429, {
        success: false,
        throttled: true,
        passwordResetForm: passwordResetForm
      });
    }

    const bucketReset = bucket?.reset(email);
    const verificationTokenCreation = createPasswordResetToken({ userId: emailInfo.userId });
    const [verificationToken] = await Promise.all([verificationTokenCreation, bucketReset]);
    const verificationLink = `${PUBLIC_ORIGIN}/auth/password-reset/${verificationToken}`;

    await sendPasswordReset({ email: email, verificationLink: verificationLink });
    return { success: true, throttled: false, passwordResetForm: passwordResetForm };
  }
};

export const load: PageServerLoad = async (event) => {
  handleAlreadyLoggedIn(event);
  if (event.locals.session) {
    return redirect(302, '/');
  }

  return {
    passwordResetForm: await superValidate(zod(passwordResetSchema))
  };
};
