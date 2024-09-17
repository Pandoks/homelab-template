import {
  ClientDataType,
  coseAlgorithmES256,
  createAssertionSignatureMessage,
  parseAuthenticatorData,
  parseClientDataJSON
} from '@oslojs/webauthn';
import {
  decodePKIXECDSASignature,
  decodeSEC1PublicKey,
  p256,
  verifyECDSASignature
} from '@oslojs/crypto/ecdsa';
import { base64url } from 'oslo/encoding';
import { verifyAuthenticatorData, verifyChallenge, verifyClientData } from '../utils';
import { db } from '$lib/db/server/postgres';
import { passkeys } from '$lib/db/postgres/schema/auth';
import { and, eq } from 'drizzle-orm';
import { sha256 } from '@oslojs/crypto/sha2';

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

  const [passkeyInfo] = await db.main
    .select({ algorithm: passkeys.algorithm, encodedPublicKey: passkeys.encodedPublicKey })
    .from(passkeys)
    .where(and(eq(passkeys.credentialId, credentialId), eq(passkeys.userId, userId)))
    .limit(1);
  if (!passkeyInfo) {
    return false;
  }

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

      return verifyECDSASignature(ecdsaPublicKey, hash, ecdsaSignature);
    } else {
      return false;
    }
  } catch (err) {
    console.error(err);
    return false;
  }
};
