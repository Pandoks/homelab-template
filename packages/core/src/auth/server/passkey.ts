import {
  AuthenticatorData,
  ClientData,
  ClientDataType,
  WebAuthnCredential,
  coseAlgorithmES256,
  coseEllipticCurveP256,
  createAssertionSignatureMessage,
  parseAuthenticatorData,
  parseClientDataJSON,
} from "@oslojs/webauthn";
import {
  ECDSAPublicKey,
  decodePKIXECDSASignature,
  decodeSEC1PublicKey,
  p256,
  verifyECDSASignature,
} from "@oslojs/crypto/ecdsa";
import { base64url, encodeHex } from "oslo/encoding";
import { and, eq } from "drizzle-orm";
import { sha256 } from "@oslojs/crypto/sha2";
import { database } from "../../database/main";
import { passkeys } from "../../database/main/schema/auth.sql";
import { ResponseError } from "../../util/error";
import { Resource } from "sst";
import { redis } from "../../redis/main";

export const verifyAuthenticatorData = (
  authenticatorData: AuthenticatorData,
): void => {
  if (!authenticatorData.verifyRelyingPartyIdHash(Resource.DNS.domain)) {
    throw new ResponseError(406, "Invalid relying party ID hash");
  } else if (
    !authenticatorData.userPresent ||
    !authenticatorData.userVerified
  ) {
    throw new ResponseError(406, "User must be present and verified");
  }
};

export const verifyClientData = ({
  clientData,
  type,
}: {
  clientData: ClientData;
  type: ClientDataType;
}): void => {
  if (clientData.type !== type) {
    throw new ResponseError(406, "Invalid client data type");
  } else if (
    clientData.origin !== Resource.DNS.origin ||
    clientData.crossOrigin
  ) {
    throw new ResponseError(406, "Invalid origin");
  }
};

export const verifyChallenge = async ({
  challengeId,
  challenge,
}: {
  challengeId: string;
  challenge: Uint8Array;
}): Promise<void> => {
  const redisQuery = `passkey-challenge:${challengeId}`;
  const clientChallengeHash = encodeHex(sha256(challenge));
  const challengeHash = await redis.get(redisQuery);
  if (!challengeHash) {
    throw new ResponseError(404);
  } else if (challengeHash !== clientChallengeHash) {
    throw new ResponseError(406, "Invalid challenge");
  }
  await redis.del(redisQuery);
};

// Parse the COSE key depending on the algorithm. The structure depends on the algorithm.
export const getPublicKeyFromCredential = (credential: WebAuthnCredential) => {
  const cosePublicKey = credential.publicKey.ec2();
  if (cosePublicKey.curve !== coseEllipticCurveP256) {
    throw new ResponseError(406, "Unsupported algorithm");
  }

  return base64url.encode(
    new ECDSAPublicKey(
      p256,
      cosePublicKey.x,
      cosePublicKey.y,
    ).encodeSEC1Uncompressed(),
  );
};

// TODO: function now throws errors. update code that uses
export const verifyPasskey = async ({
  userId,
  challengeId,
  credentialId,
  signature,
  encodedAuthenticatorData,
  clientDataJSON,
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

  await verifyChallenge({
    challengeId: challengeId,
    challenge: clientData.challenge,
  });

  const [passkeyInfo] = await database
    .select({
      algorithm: passkeys.algorithm,
      encodedPublicKey: passkeys.encodedPublicKey,
    })
    .from(passkeys)
    .where(
      and(eq(passkeys.credentialId, credentialId), eq(passkeys.userId, userId)),
    )
    .limit(1);
  if (!passkeyInfo) {
    return false;
  }

  try {
    if (passkeyInfo.algorithm === coseAlgorithmES256) {
      const ecdsaPublicKey = decodeSEC1PublicKey(
        p256,
        base64url.decode(passkeyInfo.encodedPublicKey),
      );
      const hash = sha256(
        createAssertionSignatureMessage(
          decodedAuthenticatorData,
          decodedClientDataJSON,
        ),
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
