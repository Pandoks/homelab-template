import {
  ClientDataType,
  coseAlgorithmES256,
  coseAlgorithmRS256,
  createAssertionSignatureMessage,
  parseAuthenticatorData,
  parseClientDataJSON
} from '@oslojs/webauthn';
import { base64url } from 'oslo/encoding';
import { verifyAuthenticatorData, verifyChallenge, verifyClientData } from '../utils';
import { db } from '$lib/db/postgres';
import { passkeys } from '$lib/db/postgres/schema/auth';
import { and, eq } from 'drizzle-orm';
import {
  decodePKIXECDSASignature,
  decodeSEC1PublicKey,
  p256,
  verifyECDSASignature
} from '@oslojs/crypto/ecdsa';
import { sha256 } from '@oslojs/crypto/sha2';
import {
  decodePKCS1RSAPublicKey,
  sha256ObjectIdentifier,
  verifyRSASSAPKCS1v15Signature
} from '@oslojs/crypto/rsa';

export const verifyPasskey = async ({
  userId,
  challengeId,
  credentialId,
  signature,
  encodedAuthenticatorData,
  clientDataJSON
}: {
  userId: string;
  challengeId: string;
  credentialId: string;
  signature: string;
  encodedAuthenticatorData: string;
  clientDataJSON: string;
}): Promise<boolean> => {
  const decodedSignature = base64url.decode(signature);
  const decodedAuthenticatorData = base64url.decode(encodedAuthenticatorData);
  const decodedClientDataJSON = base64url.decode(clientDataJSON);

  const authenticatorData = parseAuthenticatorData(decodedAuthenticatorData);
  verifyAuthenticatorData(authenticatorData);

  const clientData = parseClientDataJSON(decodedClientDataJSON);
  verifyClientData({ clientData: clientData, type: ClientDataType.Get });

  await verifyChallenge({ challengeId: challengeId, challenge: clientData.challenge });

  const [passkeyInfo] = await db
    .select()
    .from(passkeys)
    .where(and(eq(passkeys.credentialId, credentialId), eq(passkeys.userId, userId)))
    .limit(1);
  if (!passkeyInfo) {
    return false;
  }

  let valid = false;
  try {
    if (passkeyInfo.algorithm === coseAlgorithmES256) {
      const ecdsaPublicKey = decodeSEC1PublicKey(
        p256,
        base64url.decode(passkeyInfo.encodedPublicKey)
      );
      const hash = sha256(
        createAssertionSignatureMessage(decodedAuthenticatorData, decodedClientDataJSON)
      );
      // Decode DER-encoded signature
      const ecdsaSignature = decodePKIXECDSASignature(decodedSignature);
      valid = verifyECDSASignature(ecdsaPublicKey, hash, ecdsaSignature);
    } else if (passkeyInfo.algorithm === coseAlgorithmRS256) {
      const rsaPublicKey = decodePKCS1RSAPublicKey(base64url.decode(passkeyInfo.encodedPublicKey));
      const hash = sha256(
        createAssertionSignatureMessage(decodedAuthenticatorData, decodedClientDataJSON)
      );
      valid = verifyRSASSAPKCS1v15Signature(
        rsaPublicKey,
        sha256ObjectIdentifier,
        hash,
        decodedSignature
      );
    } else {
      return false;
    }
  } catch (err) {
    console.error(err);
    return false;
  }

  if (!valid) {
    return false;
  }

  return true;
};
