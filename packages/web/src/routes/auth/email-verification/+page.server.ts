import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { eq } from 'drizzle-orm';
import { superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import { verificationSchema } from './schema';
import type { RedisClientType } from 'redis';
import { building } from '$app/environment';
import {
  ConstantRefillTokenBucketLimiter,
  FixedRefillTokenBucketLimiter
} from '@startup-template/core/rate-limit/index';
import { redis as mainRedis } from '@startup-template/core/redis/main/index';
import {
  generateEmailVerification,
  sendVerification,
  verifyVerificationCode
} from '@startup-template/core/auth/server/email';
import { lucia } from '@startup-template/core/auth/server/index';
import { database as mainDatabase } from '@startup-template/core/database/main/index';
import { emails } from '@startup-template/core/database/main/schema/user.sql';

const verificationBucket = !building
  ? new FixedRefillTokenBucketLimiter({
      name: 'email-verification',
      max: 5,
      refillIntervalSeconds: 60 * 30, // 30 minutes
      storage: mainRedis as RedisClientType
    })
  : undefined;
const resendBucket = !building
  ? new ConstantRefillTokenBucketLimiter({
      name: 'email-resend',
      max: 5,
      refillIntervalSeconds: 60, // 1 minute
      storage: mainRedis as RedisClientType
    })
  : undefined;

export const actions: Actions = {
  'verify-email-code': async (event) => {
    // Don't use handleLoggedIn as we're verifying emails now
    const existingSession = event.locals.session;
    const user = event.locals.user;
    if (existingSession && user) {
      if (!existingSession.isTwoFactorVerified && user.hasTwoFactor) {
        return redirect(302, '/auth/2fa/otp');
      } else if (user.isEmailVerified) {
        return redirect(302, '/');
      }
    } else {
      return redirect(302, '/auth/login');
    }

    const formCheck = superValidate(event, zod(verificationSchema));
    const bucketCheck = verificationBucket?.check({ key: user.id, cost: 1 });
    const [emailVerificationForm, bucketValid] = await Promise.all([formCheck, bucketCheck]);
    if (!emailVerificationForm.valid) {
      return fail(400, {
        success: false,
        message: 'Invalid code',
        emailVerificationForm
      });
    } else if (!bucketValid) {
      return fail(429, {
        success: false,
        message: 'Too many attempts. Try again later.',
        emailVerificationForm
      });
    }

    try {
      const isValidCode = await verifyVerificationCode({
        user: user,
        code: emailVerificationForm.data.code
      });
      if (!isValidCode) {
        emailVerificationForm.errors.code = ['Invalid'];
        return fail(400, {
          success: false,
          message: 'Invalid code',
          emailVerificationForm
        });
      }
    } catch (err) {
      console.error(err);
      emailVerificationForm.errors.code = ['Invalid'];
      return fail(400, {
        success: false,
        message: 'Invalid code',
        emailVerificationForm
      });
    }

    await lucia.invalidateUserSessions(user.id);
    const emailUpdate = mainDatabase
      .update(emails)
      .set({ isVerified: true })
      .where(eq(emails.userId, user.id));
    const verificationBucketReset = verificationBucket?.reset(user.id);
    const resendBucketReset = resendBucket?.reset(user.id);
    const sessionCreation = lucia.createSession(user.id, {
      isTwoFactorVerified: false,
      isPasskeyVerified: existingSession.isPasskeyVerified
    });
    const [session] = await Promise.all([
      sessionCreation,
      resendBucketReset,
      verificationBucketReset,
      emailUpdate
    ]);
    const sessionCookie = lucia.createSessionCookie(session.id);
    event.cookies.set(sessionCookie.name, sessionCookie.value, {
      path: '/',
      ...sessionCookie.attributes
    });

    redirect(302, '/');
  },
  resend: async (event) => {
    // Don't use handleLoggedIn as we're verifying emails now
    const existingSession = event.locals.session;
    const user = event.locals.user;
    if (existingSession && user) {
      if (!existingSession.isTwoFactorVerified && user.hasTwoFactor) {
        return redirect(302, '/auth/2fa/otp');
      } else if (user.isEmailVerified) {
        return redirect(302, '/');
      }
    } else {
      return redirect(302, '/auth/login');
    }

    if (!(await resendBucket?.check({ key: user.id, cost: 1 }))) {
      return fail(429, {
        success: false,
        limited: true
      });
    }
    const verificationCode = await generateEmailVerification({
      userId: user.id,
      email: user.email
    });
    await sendVerification({ email: user.email, code: verificationCode });

    return {
      success: true,
      limited: false
    };
  }
};

export const load: PageServerLoad = async (event) => {
  // Don't use handleLoggedIn as we're verifying emails now
  const session = event.locals.session;
  const user = event.locals.user;
  if (session && user) {
    if (!session.isTwoFactorVerified && user.hasTwoFactor && !session.isPasskeyVerified) {
      return redirect(302, '/auth/2fa/otp');
    } else if (user.isEmailVerified) {
      return redirect(302, '/');
    }
  } else {
    return redirect(302, '/auth/login');
  }

  return {
    emailVerificationForm: await superValidate(zod(verificationSchema))
  };
};
