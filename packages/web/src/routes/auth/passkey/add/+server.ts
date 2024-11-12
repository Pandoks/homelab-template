import {
  AttestationStatementFormat,
  ClientDataType,
  coseAlgorithmES256,
  coseAlgorithmRS256,
  parseAttestationObject,
  parseClientDataJSON
} from '@oslojs/webauthn';
import { handleAlreadyLoggedIn } from '$lib/auth/server';
import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { passkeyRegistrationSchema } from '../schema';
import {
  getPublicKeyFromCredential,
  verifyAuthenticatorData,
  verifyChallenge,
  verifyClientData
} from '@startup-template/core/auth/server/passkey';
import { database } from '@startup-template/core/database/main/index';
import { passkeys } from '@startup-template/core/database/main/schema/auth.sql';

/**
 * Client hits this endpoint to add a new passkey to their EXISTING account. (must be logged in)
 */
export const POST: RequestHandler = async (event) => {
  handleAlreadyLoggedIn(event);
  if (!event.locals.session || !event.locals.user) {
    return error(401);
  }

  let passkeyRegistrationJSON = await event.request.json();
  const parseResult = passkeyRegistrationSchema.safeParse(passkeyRegistrationJSON);
  if (!parseResult.success) {
    return error(415);
  }
  const data = parseResult.data;

  const attestationObject = base64url.decode(data.attestationObject);

  const { attestationStatement, authenticatorData } = parseAttestationObject(attestationObject);
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

  const clientDataJSON = base64url.decode(data.clientDataJSON);
  const clientData = parseClientDataJSON(clientDataJSON);
  verifyClientData({ clientData: clientData, type: ClientDataType.Create });
  await verifyChallenge({ challengeId: data.challengeId, challenge: clientData.challenge });

  try {
    await database.insert(passkeys).values({
      userId: event.locals.user.id,
      credentialId: base64url.encode(credential.id),
      algorithm: algorithm,
      encodedPublicKey: publicKey,
      name: data.name
    });
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

    return error(500);
  }

  return json({
    success: true
  });
};
