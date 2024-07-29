import { handleAlreadyLoggedIn } from '$lib/auth/server';
import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { passkeyRegistrationSchema } from '../schema';
import { base64url } from 'oslo/encoding';
import {
  AttestationStatementFormat,
  ClientDataType,
  coseAlgorithmES256,
  coseAlgorithmRS256,
  parseAttestationObject,
  parseClientDataJSON
} from '@oslojs/webauthn';
import {
  getEncodedPublicKeyFromCredential,
  verifyAuthenticatorData,
  verifyChallenge,
  verifyClientData
} from '../utils';
import { db } from '$lib/db/postgres';
import { passkeys } from '$lib/db/postgres/schema/auth';

/**
 * Client hits this endpoint to create a NEW account with a passkey (first time user)
 */
export const POST: RequestHandler = async (event) => {
  handleAlreadyLoggedIn(event);
  if (!event.locals.session || !event.locals.user) {
    return error(401);
  }

  const passkeyRegistration = await event.request.json();
  if (!passkeyRegistrationSchema.safeParse(passkeyRegistration).success) {
    return error(415);
  }

  const id = passkeyRegistration.id;
  const encodedAttestationObject = base64url.decode(passkeyRegistration.attestationObject);
  const clientDataJSON = base64url.decode(passkeyRegistration.clientDataJSON);

  const { attestationStatement, authenticatorData } =
    parseAttestationObject(encodedAttestationObject);
  if (attestationStatement.format !== AttestationStatementFormat.None) {
    return error(406, { message: 'Invalid attestation statement format' });
  }

  verifyAuthenticatorData(authenticatorData);

  const credential = authenticatorData.credential;
  if (!credential) {
    return error(406, { message: 'Missing credential' });
  }

  const algorithm = credential.publicKey.algorithm();
  if (!algorithm || (algorithm !== coseAlgorithmES256 && algorithm !== coseAlgorithmRS256)) {
    return error(406, { message: 'Unsupported algorithm' });
  }

  const encodedPublicKey = getEncodedPublicKeyFromCredential(credential);

  const clientData = parseClientDataJSON(clientDataJSON);
  verifyClientData({ clientData: clientData, type: ClientDataType.Create });
  await verifyChallenge({ id: id, challenge: clientData.challenge });

  try {
    await db.insert(passkeys).values({
      userId: event.locals.user.id,
      credentialId: base64url.encode(credential.id),
      algorithm: algorithm,
      encodedPublicKey: base64url.encode(encodedPublicKey)
    });

    // if (!userInfo) {
    //   console.log('new user signup');
    //   // new user signup
    //   const email = passkeyRegistration.email;
    //   const id = generateIdFromEntropySize(10);
    //   await db.transaction(async (transaction) => {
    //     await transaction.insert(users).values({
    //       id: id,
    //       username: username,
    //       email: email,
    //       passwordHash: null,
    //       isEmailVerified: false,
    //       hasTwoFactor: false,
    //       twoFactorSecret: null,
    //       twoFactorRecoveryHash: null
    //     });
    //     await transaction.insert(passkeys).values({ userId: id, ...databaseInfo });
    //   });
    //
    //   const verificationCode = await generateEmailVerification({
    //     userId: id,
    //     email: email
    //   });
    //   console.log('created email verification code');
    //   await sendVerification({ email: email, code: verificationCode });
    // } else {
  } catch (err) {
    // @ts-ignore
    if (err!.code) {
      // @ts-ignore
      const constraint_name = err!.constraint_name;
      if (constraint_name === 'users_username_unique') {
        return error(400, {
          message: 'Username already exists'
        });
      } else if (constraint_name === 'users_email_unique') {
        return error(400, {
          message: 'Email already exists'
        });
      }
    }

    console.error(err);
    return error(500);
  }

  return json({
    success: true
  });
};
