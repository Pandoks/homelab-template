import {
  type AuthenticatorData,
  type ClientData,
  ClientDataType,
  type WebAuthnCredential,
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
import { and, eq } from "drizzle-orm";
import { sha256 } from "@oslojs/crypto/sha2";
import { passkeys } from "@homelab-template/postgres/main/auth.sql";
import {
  decodeBase64url,
  encodeBase64url,
  encodeHexLowerCase,
} from "@oslojs/encoding";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { getAppInfo } from "../../util";
import { RedisClientType, RedisClusterType } from "redis";

export const verifyAuthenticatorData = (
  authenticatorData: AuthenticatorData,
): boolean => {
  return (
    authenticatorData.verifyRelyingPartyIdHash(getAppInfo("domain")!) &&
    authenticatorData.userPresent &&
    authenticatorData.userVerified
  );
};

export const verifyClientData = ({
  clientData,
  type,
}: {
  clientData: ClientData;
  type: ClientDataType;
}): boolean => {
  return (
    clientData.type === type &&
    clientData.origin === getAppInfo("origin") &&
    !clientData.crossOrigin
  );
};

export const verifyChallenge = async ({
  challengeId,
  challenge,
  redis,
}: {
  challengeId: string;
  challenge: Uint8Array;
  redis: RedisClientType | RedisClusterType;
}): Promise<boolean> => {
  const redisQuery = `passkey-challenge:${challengeId}`;
  const clientChallengeHash = encodeHexLowerCase(sha256(challenge));
  const challengeHash = await redis.get(redisQuery);
  if (!challengeHash || challengeHash !== clientChallengeHash) {
    return false;
  }
  await redis.del(redisQuery);
  return true;
};

// Parse the COSE key depending on the algorithm. The structure depends on the algorithm.
export const getPublicKeyFromCredential = (credential: WebAuthnCredential) => {
  const cosePublicKey = credential.publicKey.ec2();
  if (cosePublicKey.curve !== coseEllipticCurveP256) {
    throw new Error("Unsupported algorithm");
  }

  return encodeBase64url(
    new ECDSAPublicKey(
      p256,
      cosePublicKey.x,
      cosePublicKey.y,
    ).encodeSEC1Uncompressed(),
  );
};

export const verifyPasskey = async ({
  userId,
  challengeId,
  credentialId,
  signature,
  encodedAuthenticatorData,
  clientDataJSON,
  database,
  redis,
}: {
  userId: string;
  challengeId: string;
  credentialId: string;
  signature: string;
  encodedAuthenticatorData: string;
  clientDataJSON: string;
  database: PostgresJsDatabase;
  redis: RedisClientType | RedisClusterType;
}): Promise<boolean> => {
  const decodedSignature = decodeBase64url(signature);
  const decodedAuthenticatorData = decodeBase64url(encodedAuthenticatorData);
  const decodedClientDataJSON = decodeBase64url(clientDataJSON);

  const authenticatorData = parseAuthenticatorData(decodedAuthenticatorData);
  if (!verifyAuthenticatorData(authenticatorData)) {
    return false;
  }

  const clientData = parseClientDataJSON(decodedClientDataJSON);
  if (!verifyClientData({ clientData: clientData, type: ClientDataType.Get })) {
    return false;
  }

  if (
    !(await verifyChallenge({
      challengeId: challengeId,
      challenge: clientData.challenge,
      redis: redis,
    }))
  ) {
    return false;
  }

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
        decodeBase64url(passkeyInfo.encodedPublicKey),
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
