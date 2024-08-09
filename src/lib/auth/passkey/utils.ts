import {
  ClientDataType,
  coseAlgorithmES256,
  coseAlgorithmRS256,
  coseEllipticCurveP256,
  type AuthenticatorData,
  type ClientData,
  type WebAuthnCredential
} from '@oslojs/webauthn';
import { env } from '$env/dynamic/public';
import { redis } from '$lib/db/server/redis';
import { ECDSAPublicKey, p256 } from '@oslojs/crypto/ecdsa';
import { RSAPublicKey } from '@oslojs/crypto/rsa';
import { sha256 } from '@oslojs/crypto/sha2';
import { error } from '@sveltejs/kit';
import { base64url, encodeHex } from 'oslo/encoding';

export const verifyAuthenticatorData = (authenticatorData: AuthenticatorData): void => {
  if (!authenticatorData.verifyRelyingPartyIdHash(env.PUBLIC_APP_DOMAIN)) {
    return error(406, { message: 'Invalid relying party ID hash' });
  } else if (!authenticatorData.userPresent || !authenticatorData.userVerified) {
    return error(406, { message: 'User must be present and verified' });
  }
};

export const verifyClientData = ({
  clientData,
  type
}: {
  clientData: ClientData;
  type: ClientDataType;
}): void => {
  if (clientData.type !== type) {
    return error(406, { message: 'Invalid client data type' });
  } else if (clientData.origin !== env.PUBLIC_APP_ORIGIN || clientData.crossOrigin) {
    return error(406, { message: 'Invalid origin' });
  }
};

export const verifyChallenge = async ({
  challengeId,
  challenge
}: {
  challengeId: string;
  challenge: Uint8Array;
}): Promise<void> => {
  const redisQuery = `passkey-challenge:${challengeId}`;
  const clientChallengeHash = encodeHex(sha256(challenge));
  const challengeHash = await redis.main.instance.get(redisQuery);
  if (!challengeHash) {
    return error(404);
  } else if (challengeHash !== clientChallengeHash) {
    return error(406, { message: 'Invalid challenge' });
  }
  await redis.main.instance.del(redisQuery);
};

// Parse the COSE key depending on the algorithm. The structure depends on the algorithm.
export const getPublicKeyFromCredential = (credential: WebAuthnCredential) => {
  const algorithm = credential.publicKey.algorithm();
  if (!algorithm || (algorithm !== coseAlgorithmES256 && algorithm !== coseAlgorithmRS256)) {
    return error(406, { message: 'Unsupported algorithm' });
  }

  if (algorithm === coseAlgorithmES256) {
    const cosePublicKey = credential.publicKey.ec2();
    if (cosePublicKey.curve !== coseEllipticCurveP256) {
      return error(406, { message: 'Unsupported algorithm' });
    }

    return base64url.encode(
      new ECDSAPublicKey(p256, cosePublicKey.x, cosePublicKey.y).encodeSEC1Uncompressed()
    );
  } else {
    const cosePublicKey = credential.publicKey.rsa();
    return base64url.encode(new RSAPublicKey(cosePublicKey.n, cosePublicKey.e).encodePKCS1());
  }
};
