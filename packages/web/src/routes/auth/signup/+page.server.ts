import {
  AttestationStatementFormat,
  ClientDataType,
  coseAlgorithmES256,
  parseAttestationObject,
  parseClientDataJSON
} from '@oslojs/webauthn';
import type { Actions, PageServerLoad } from './$types';
import { hash } from '@node-rs/argon2';
import { error, fail, redirect } from '@sveltejs/kit';
import { superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import { signupPasskeySchema, signupSchema } from './schema';
import { eq } from 'drizzle-orm';
import type { RedisClientType } from 'redis';
import { building } from '$app/environment';
import { NODE_ENV } from '$env/static/private';
import { ConstantRefillTokenBucketLimiter } from '@startup-template/core/rate-limit/index';
import { redis as mainRedis } from '@startup-template/core/redis/main/index';
import { handleAlreadyLoggedIn } from '$lib/auth/server';
import {
  createSession,
  generateSessionToken,
  verifyPasswordStrength
} from '@startup-template/core/auth/server/index';
import { database as mainDatabase } from '@startup-template/core/database/main/index';
import { emails, users } from '@startup-template/core/database/main/schema/user.sql';
import {
  passkeys,
  twoFactorAuthenticationCredentials
} from '@startup-template/core/database/main/schema/auth.sql';
import {
  generateEmailVerification,
  sendVerification
} from '@startup-template/core/auth/server/email';
import {
  getPublicKeyFromCredential,
  verifyAuthenticatorData,
  verifyChallenge,
  verifyClientData
} from '@startup-template/core/auth/server/passkey';
import { decodeBase64url, encodeBase32LowerCaseNoPadding, encodeBase64url } from '@oslojs/encoding';
import { deleteSessionTokenCookie, setSessionTokenCookie } from '$lib/auth/server/sessions';

const refillIntervalSeconds = NODE_ENV === 'test' ? 0 : 5;
const bucket = !building
  ? new ConstantRefillTokenBucketLimiter({
      name: 'signup-limiter',
      max: 10,
      refillIntervalSeconds: refillIntervalSeconds,
      storage: mainRedis as RedisClientType
    })
  : undefined;

export const actions: Actions = {
  signup: async (event) => {
    handleAlreadyLoggedIn(event);
    if (event.locals.session) {
      return redirect(302, '/');
    }

    const ipAddress = event.getClientAddress();
    const formValidation = superValidate(event, zod(signupSchema));
    const bucketCheck = bucket?.check({ key: ipAddress, cost: 1 });
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
    const userId = encodeBase32LowerCaseNoPadding(crypto.getRandomValues(new Uint8Array(10))); // 16 characters long
    const email = signupForm.data.email.toLowerCase();
    const username = signupForm.data.username.toLowerCase();

    try {
      await mainDatabase.transaction(async (tsx) => {
        await tsx.insert(users).values({
          id: userId,
          username: username,
          passwordHash: passwordHash
        });
        await tsx.insert(emails).values({
          email: email,
          isVerified: false,
          userId: userId
        });
        await tsx.insert(twoFactorAuthenticationCredentials).values({
          twoFactorKey: null,
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
      const sessionToken = generateSessionToken();
      const sessionCreation = createSession({
        userId,
        sessionToken,
        isTwoFactorVerified: false,
        isPasskeyVerified: false
      });
      const [session] = await Promise.all([sessionCreation, sendVerificationCode]);

      setSessionTokenCookie({
        event,
        sessionToken: sessionToken,
        expiresAt: session.expiresAt
      });
    } catch (err) {
      // @ts-ignore
      if (err.code) {
        // @ts-ignore
        const constraint_name = err.constraint_name;
        if (constraint_name === 'users_username_unique') {
          signupForm.errors.username = ['Username already exists'];
          return fail(400, {
            success: false,
            message: 'Username already exists',
            signupForm
          });
        } else if (constraint_name === 'emails_pkey') {
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
    const bucketCheck = bucket?.check({ key: ipAddress, cost: 1 });
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
      decodeBase64url(signupForm.data.attestationObject)
    );
    if (attestationStatement.format !== AttestationStatementFormat.None) {
      return error(406, { message: 'Invalid attestation statement format' });
    }

    verifyAuthenticatorData(authenticatorData);

    const credential = authenticatorData.credential;
    if (!credential) {
      return error(406, { message: 'Missing credential' });
    }

    const algorithm = credential.publicKey.algorithm();
    if (!algorithm || algorithm !== coseAlgorithmES256) {
      return error(406, { message: 'Unsupported algorithm' });
    }
    const publicKey = getPublicKeyFromCredential(credential);

    const clientData = parseClientDataJSON(decodeBase64url(signupForm.data.clientDataJSON));
    verifyClientData({ clientData: clientData, type: ClientDataType.Create });
    await verifyChallenge({
      challengeId: signupForm.data.challengeId,
      challenge: clientData.challenge
    });

    try {
      const userId = encodeBase32LowerCaseNoPadding(crypto.getRandomValues(new Uint8Array(10))); // 40 characters
      const email = signupForm.data.email.toLowerCase();
      const username = signupForm.data.username.toLowerCase();

      await mainDatabase.transaction(async (tsx) => {
        await tsx.insert(users).values({
          id: userId,
          username: username,
          passwordHash: null
        });
        await tsx.insert(emails).values({
          email: email,
          isVerified: false,
          userId: userId
        });
        await tsx.insert(twoFactorAuthenticationCredentials).values({
          twoFactorKey: null,
          twoFactorRecoveryHash: null,
          activated: false,
          userId: userId
        });
        await tsx.insert(passkeys).values({
          credentialId: encodeBase64url(credential.id),
          name: 'Main Passkey',
          algorithm: algorithm,
          encodedPublicKey: publicKey,
          userId: userId
        });
      });

      const verificationCode = await generateEmailVerification({
        userId: userId,
        email: email
      });

      const sendVerificationCode = sendVerification({ email: email, code: verificationCode });
      const sessionToken = generateSessionToken();
      const sessionCreation = createSession({
        sessionToken,
        userId: userId,
        isTwoFactorVerified: false,
        isPasskeyVerified: true
      });
      const [session] = await Promise.all([sessionCreation, sendVerificationCode]);
      setSessionTokenCookie({ event, sessionToken, expiresAt: session.expiresAt });
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
    await mainDatabase.delete(users).where(eq(users.id, user.id));

    deleteSessionTokenCookie(event);
  }

  const [signupForm, signupPasskeyForm] = await Promise.all([
    superValidate(zod(signupSchema)),
    superValidate(zod(signupPasskeySchema))
  ]);

  return {
    signupForm,
    signupPasskeyForm
  };
};
