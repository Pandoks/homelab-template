import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { lucia } from '$lib/auth/server';
import { db } from '$lib/db/postgres';
import { users } from '$lib/db/postgres/schema';
import { eq } from 'drizzle-orm';
import {
  generateEmailVerification,
  sendVerification,
  verifyVerificationCode
} from '$lib/auth/server/email';
import { superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import { verificationSchema } from './schema';
import type { Session, User } from 'lucia';
import { FixedRefillTokenBucketLimiter } from '$lib/rate-limit/server';
import { redis } from '$lib/db/redis';
import type { RedisClientType } from 'redis';

const verificationBucket = new FixedRefillTokenBucketLimiter({
  name: 'email-verification',
  max: 5,
  refillIntervalSeconds: 60 * 30, // 30 minutes
  storage: redis.main as RedisClientType
});
const resendBucket = new FixedRefillTokenBucketLimiter({
  name: 'email-resend',
  max: 5,
  refillIntervalSeconds: 60, // 1 minute
  storage: redis.main as RedisClientType
});

export const actions: Actions = {
  'verify-email-code': async (event) => {
    const emailVerificationForm = await superValidate(event, zod(verificationSchema));
    if (!emailVerificationForm.valid) {
      return fail(400, {
        success: false,
        message: 'Invalid code',
        emailVerificationForm
      });
    }

    const user = event.locals.user;
    if (!user || !event.locals.session) {
      emailVerificationForm.errors.code = ['Invalid'];
      return fail(400, {
        success: false,
        message: 'Invalid code',
        emailVerificationForm
      });
    }

    if (!(await verificationBucket.check({ key: user.id, cost: 1 }))) {
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

      await lucia.invalidateUserSessions(user.id);
      await db.update(users).set({ isEmailVerified: true }).where(eq(users.id, user.id));
    } catch (err) {
      console.error(err);
      emailVerificationForm.errors.code = ['Invalid'];
      return fail(400, {
        success: false,
        message: 'Invalid code',
        emailVerificationForm
      });
    }

    await verificationBucket.reset(user.id);
    const session = await lucia.createSession(user.id, {
      isTwoFactorVerified: false,
      isPasskeyVerified: event.locals.session.isPasskeyVerified
    });
    const sessionCookie = lucia.createSessionCookie(session.id);
    event.cookies.set(sessionCookie.name, sessionCookie.value, {
      path: '/',
      ...sessionCookie.attributes
    });

    redirect(302, '/');
  },
  resend: async (event) => {
    const user = event.locals.user;
    if (!user || user.isEmailVerified) {
      return fail(400, {
        success: false,
        limited: false
      });
    }

    if (!(await resendBucket.check({ key: user.id, cost: 1 }))) {
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

    await resendBucket.reset(user.id);
    return {
      success: true,
      limited: false
    };
  }
};

export const load: PageServerLoad = async (event) => {
  // Don't use handleLoggedIn as we're verifying emails now
  const session: Session | null = event.locals.session;
  const user: User | null = event.locals.user;
  if (session && user) {
    if (!session.isTwoFactorVerified && user!.hasTwoFactor) {
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
