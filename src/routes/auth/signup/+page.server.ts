import { generateIdFromEntropySize } from 'lucia';
import type { Actions, PageServerLoad } from './$types';
import { hash } from '@node-rs/argon2';
import { error, fail, redirect } from '@sveltejs/kit';
import { db } from '$lib/db/postgres';
import { users } from '$lib/db/postgres/schema';
import { handleAlreadyLoggedIn, lucia } from '$lib/auth/server';
import { generateEmailVerification, sendVerification } from '$lib/auth/server/email';
import { superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import { signupPasskeySchema, signupSchema } from './schema';
import { eq } from 'drizzle-orm';
import { emailVerifications, passkeys } from '$lib/db/postgres/schema/auth';
import {
  AttestationStatementFormat,
  ClientDataType,
  coseAlgorithmES256,
  coseAlgorithmRS256,
  parseAttestationObject,
  parseClientDataJSON
} from '@oslojs/webauthn';
import { base64url } from 'oslo/encoding';
import {
  getPublicKeyFromCredential,
  verifyAuthenticatorData,
  verifyChallenge,
  verifyClientData
} from '$lib/auth/passkey/utils';

export const actions: Actions = {
  signup: async (event) => {
    handleAlreadyLoggedIn(event);

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

    const signupForm = await superValidate(event, zod(signupPasskeySchema));
    if (!signupForm.valid) {
      return fail(400, {
        success: false,
        message: '',
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
    await verifyChallenge({ id: signupForm.data.id, challenge: clientData.challenge });

    try {
      const userId = generateIdFromEntropySize(10);
      const email = signupForm.data.email;

      await db.transaction(async (transaction) => {
        await transaction.insert(users).values({
          id: userId,
          username: signupForm.data.username,
          email: email,
          passwordHash: null,
          isEmailVerified: false,
          hasTwoFactor: false,
          twoFactorSecret: null,
          twoFactorRecoveryHash: null
        });
        await transaction.insert(passkeys).values({
          credentialId: signupForm.data.id,
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
      await sendVerification({ email: email, code: verificationCode });

      const session = await lucia.createSession(userId, {
        isTwoFactorVerified: false,
        isPasskeyVerified: true
      });
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
    if (user.hasTwoFactor && !session.isTwoFactorVerified) {
      return redirect(302, '/auth/2fa/otp');
    } else if (user.isEmailVerified) {
      return redirect(302, '/');
    }

    await lucia.invalidateSession(session.id);
    const sessionCookie = lucia.createBlankSessionCookie();
    event.cookies.set(sessionCookie.name, sessionCookie.value, {
      path: '/',
      ...sessionCookie.attributes
    });

    await db.delete(emailVerifications).where(eq(emailVerifications.userId, user.id));
    await db.delete(users).where(eq(users.id, user.id));
  }

  return {
    signupForm: await superValidate(zod(signupSchema)),
    signupPasskeyForm: await superValidate(zod(signupPasskeySchema))
  };
};
