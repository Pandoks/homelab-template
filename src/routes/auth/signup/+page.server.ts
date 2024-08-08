import {
  AttestationStatementFormat,
  ClientDataType,
  coseAlgorithmES256,
  coseAlgorithmRS256,
  parseAttestationObject,
  parseClientDataJSON
} from '@oslojs/webauthn';
import {
  getPublicKeyFromCredential,
  verifyAuthenticatorData,
  verifyChallenge,
  verifyClientData
} from '$lib/auth/passkey/utils';
import { generateIdFromEntropySize } from 'lucia';
import type { Actions, PageServerLoad } from './$types';
import { hash } from '@node-rs/argon2';
import { error, fail, redirect } from '@sveltejs/kit';
import { db } from '$lib/db/server/postgres';
import { emails, users } from '$lib/db/postgres/schema';
import { handleAlreadyLoggedIn, lucia, verifyPasswordStrength } from '$lib/auth/server';
import { generateEmailVerification, sendVerification } from '$lib/auth/server/email';
import { superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import { signupPasskeySchema, signupSchema } from './schema';
import { eq } from 'drizzle-orm';
import { passkeys, twoFactorAuthenticationCredentials } from '$lib/db/postgres/schema/auth';
import { base64url } from 'oslo/encoding';
import { ConstantRefillTokenBucketLimiter } from '$lib/rate-limit/server';
import { redis } from '$lib/db/server/redis';
import type { RedisClientType } from 'redis';

const bucket = new ConstantRefillTokenBucketLimiter({
  name: 'signup-limiter',
  max: 10,
  refillIntervalSeconds: 5,
  storage: redis.main.instance as RedisClientType
});

export const actions: Actions = {
  signup: async (event) => {
    handleAlreadyLoggedIn(event);
    if (event.locals.session) {
      return redirect(302, '/');
    }

    const ipAddress = event.getClientAddress();
    const formValidation = superValidate(event, zod(signupSchema));
    const bucketCheck = bucket.check({ key: ipAddress, cost: 1 });
    const [validBucket, signupForm] = await Promise.all([bucketCheck, formValidation]);
    if (!signupForm.valid) {
      return fail(400, {
        success: false,
        message: '',
        signupForm
      });
    } else if (!validBucket) {
      return fail(429, {
        success: false,
        message: 'Signing Up Too Many Times. Try Later',
        signupForm
      });
    }

    const password = signupForm.data.password;
    const strongPassword = await verifyPasswordStrength(password);
    if (!strongPassword) {
      signupForm.errors.password = ['Weak password'];
      return fail(400, {
        success: false,
        message: 'Password found in compromised databases',
        signupForm
      });
    }

    const passwordHash = await hash(password, {
      // recommended minimum parameters
      memoryCost: 19456,
      timeCost: 2,
      outputLen: 32,
      parallelism: 1
    });
    const userId = generateIdFromEntropySize(10); // 16 characters long
    const email = signupForm.data.email.toLowerCase();

    try {
      await db.main.transaction(async (tsx) => {
        await tsx.insert(users).values({
          id: userId,
          username: signupForm.data.username.toLowerCase(),
          passwordHash: passwordHash
        });
        await tsx.insert(emails).values({
          email: email,
          isVerified: false,
          userId: userId
        });
        await tsx.insert(twoFactorAuthenticationCredentials).values({
          twoFactorSecret: null,
          twoFactorRecoveryHash: null,
          activated: false,
          userId: userId
        });
      });

      const verificationCode = await generateEmailVerification({
        userId: userId,
        email: email
      });
      const sendVerificationCode = sendVerification({ email: email, code: verificationCode });
      const sessionCreation = lucia.createSession(userId, {
        isTwoFactorVerified: false,
        isPasskeyVerified: false
      });
      const [session] = await Promise.all([sessionCreation, sendVerificationCode]);

      const sessionCookie = lucia.createSessionCookie(session.id);
      event.cookies.set(sessionCookie.name, sessionCookie.value, {
        path: '/',
        ...sessionCookie.attributes
      });
    } catch (err) {
      console.error(err);
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
  },
  'signup-passkey': async (event) => {
    handleAlreadyLoggedIn(event);
    if (event.locals.session) {
      return redirect(302, '/');
    }

    const ipAddress = event.getClientAddress();
    const formValidation = superValidate(event, zod(signupPasskeySchema));
    const bucketCheck = bucket.check({ key: ipAddress, cost: 1 });
    const [signupForm, validBucket] = await Promise.all([formValidation, bucketCheck]);
    if (!signupForm.valid) {
      return fail(400, {
        success: false,
        message: '',
        signupForm
      });
    } else if (!validBucket) {
      return fail(429, {
        success: false,
        message: 'Signing Up Too Many Times. Try Later',
        signupForm
      });
    }

    const { attestationStatement, authenticatorData } = parseAttestationObject(
      base64url.decode(signupForm.data.attestationObject)
    );
    if (attestationStatement.format !== AttestationStatementFormat.None) {
      return error(406, { message: 'Invalid attestation statement format' });
    }

    verifyAuthenticatorData(authenticatorData);

    const credential = authenticatorData.credential;
    if (!credential) {
      return error(406, { message: 'Missing credential' });
    }
    const publicKey = getPublicKeyFromCredential(credential);

    const algorithm = credential.publicKey.algorithm();
    if (!algorithm || (algorithm !== coseAlgorithmES256 && algorithm !== coseAlgorithmRS256)) {
      return error(406, { message: 'Unsupported algorithm' });
    }

    const clientData = parseClientDataJSON(base64url.decode(signupForm.data.clientDataJSON));
    verifyClientData({ clientData: clientData, type: ClientDataType.Create });
    await verifyChallenge({
      challengeId: signupForm.data.challengeId,
      challenge: clientData.challenge
    });

    try {
      const userId = generateIdFromEntropySize(10);
      const email = signupForm.data.email.toLowerCase();

      const insertNewUser = db.main.transaction(async (tsx) => {
        await tsx.insert(users).values({
          id: userId,
          username: signupForm.data.username.toLowerCase(),
          passwordHash: null
        });
        await tsx.insert(emails).values({
          email: email,
          isVerified: false,
          userId: userId
        });
        await tsx.insert(twoFactorAuthenticationCredentials).values({
          twoFactorSecret: null,
          twoFactorRecoveryHash: null,
          activated: false,
          userId: userId
        });
        await tsx.insert(passkeys).values({
          credentialId: base64url.encode(credential.id),
          name: 'Main Passkey',
          algorithm: algorithm,
          encodedPublicKey: publicKey,
          userId: userId
        });
      });

      const createEmailCode = generateEmailVerification({
        userId: userId,
        email: email
      });

      const [verificationCode] = await Promise.all([createEmailCode, insertNewUser]);

      const sendVerificationCode = sendVerification({ email: email, code: verificationCode });
      const sessionCreation = lucia.createSession(userId, {
        isTwoFactorVerified: false,
        isPasskeyVerified: true
      });
      const [session] = await Promise.all([sessionCreation, sendVerificationCode]);

      const sessionCookie = lucia.createSessionCookie(session.id);
      event.cookies.set(sessionCookie.name, sessionCookie.value, {
        path: '/',
        ...sessionCookie.attributes
      });
    } catch (err) {
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
    }

    return redirect(302, '/auth/email-verification');
  }
};

export const load: PageServerLoad = async (event) => {
  const session = event.locals.session;
  const user = event.locals.user;
  if (session && user) {
    if (user.hasTwoFactor && !session.isTwoFactorVerified && !session.isPasskeyVerified) {
      return redirect(302, '/auth/2fa/otp');
    } else if (user.isEmailVerified) {
      return redirect(302, '/');
    }

    // not email verified: delete account if signing up again
    await db.main.delete(users).where(eq(users.id, user.id));

    const sessionCookie = lucia.createBlankSessionCookie();
    event.cookies.set(sessionCookie.name, sessionCookie.value, {
      path: '/',
      ...sessionCookie.attributes
    });
  }

  return {
    signupForm: await superValidate(zod(signupSchema)),
    signupPasskeyForm: await superValidate(zod(signupPasskeySchema))
  };
};
