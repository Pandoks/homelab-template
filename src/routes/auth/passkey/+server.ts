import {
  AttestationStatementFormat,
  ClientDataType,
  coseAlgorithmES256,
  coseAlgorithmRS256,
  createAssertionSignatureMessage,
  parseAttestationObject,
  parseAuthenticatorData,
  parseClientDataJSON
} from '@oslojs/webauthn';
import {
  p256,
  decodeSEC1PublicKey,
  verifyECDSASignature,
  decodePKIXECDSASignature
} from '@oslojs/crypto/ecdsa';
import {
  decodePKCS1RSAPublicKey,
  sha256ObjectIdentifier,
  verifyRSASSAPKCS1v15Signature
} from '@oslojs/crypto/rsa';
import type { RequestHandler } from './$types';
import { error, json } from '@sveltejs/kit';
import { passkeyAuthenticationSchema, passkeyRegistrationSchema } from './schema';
import { base64url } from 'oslo/encoding';
import { db } from '$lib/db/postgres';
import { passkeys } from '$lib/db/postgres/schema/auth';
import { eq } from 'drizzle-orm';
import { handleAlreadyLoggedIn } from '$lib/auth/server';
import { sha256 as syncSha256 } from '@oslojs/crypto/sha2';
import { verifyAuthenticatorData, verifyChallenge, verifyClientData } from './utils';

/**
 * Client hits this endpoint to authenticate a passkey (login)
 */
export const PATCH: RequestHandler = async (event) => {
  handleAlreadyLoggedIn(event);

  const passkeyAuthentication = await event.request.json();
  if (!passkeyAuthenticationSchema.safeParse(passkeyAuthentication).success) {
    return error(415);
  }

  const id = passkeyAuthentication.id;
  const credentialId = passkeyAuthentication.credentialId;
  const signature = base64url.decode(passkeyAuthentication.signature);
  const encodedAuthenticatorData = base64url.decode(passkeyAuthentication.encodedAuthenticatorData);
  const clientDataJSON = base64url.decode(passkeyAuthentication.clientDataJSON);

  const authenticatorData = parseAuthenticatorData(encodedAuthenticatorData);
  verifyAuthenticatorData(authenticatorData);

  const clientData = parseClientDataJSON(clientDataJSON);
  verifyClientData({ clientData: clientData, type: ClientDataType.Get });

  await verifyChallenge({ id: id, challenge: clientData.challenge });

  const [passkeyInfo] = await db
    .select()
    .from(passkeys)
    .where(eq(passkeys.credentialId, credentialId))
    .limit(1);
  if (!passkeyInfo) {
    return error(404);
  }
  console.log('passkey info: ', passkeyInfo);
  console.log('passkey algorithm === es256: ', passkeyInfo.algorithm, coseAlgorithmES256);
  console.log('authenticator data: ', authenticatorData);

  let valid = false;
  try {
    if (passkeyInfo.algorithm === coseAlgorithmES256) {
      const ecdsaPublicKey = decodeSEC1PublicKey(
        p256,
        base64url.decode(passkeyInfo.encodedPublicKey)
      );
      const hash = syncSha256(
        createAssertionSignatureMessage(encodedAuthenticatorData, clientDataJSON)
      );
      // Decode DER-encoded signature
      const ecdsaSignature = decodePKIXECDSASignature(signature);
      valid = verifyECDSASignature(ecdsaPublicKey, hash, ecdsaSignature);
    } else if (passkeyInfo.algorithm === coseAlgorithmRS256) {
      const rsaPublicKey = decodePKCS1RSAPublicKey(base64url.decode(passkeyInfo.encodedPublicKey));
      const hash = syncSha256(
        createAssertionSignatureMessage(encodedAuthenticatorData, clientDataJSON)
      );
      console.log('testing rsa');
      valid = verifyRSASSAPKCS1v15Signature(rsaPublicKey, sha256ObjectIdentifier, hash, signature);
    } else {
      return error(409);
    }
  } catch (err) {
    console.error(err);
    return error(500);
  }
  console.log('valid: ', valid);
  if (!valid) {
    return error(400);
  }

  return json({
    success: true
  });
};
