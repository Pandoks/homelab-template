import {
  AttestationStatementFormat,
  ClientDataType,
  coseAlgorithmES256,
  coseAlgorithmRS256,
  coseEllipticCurveP256,
  parseAttestationObject,
  parseClientDataJSON,
  type COSEEC2PublicKey,
  type COSERSAPublicKey
} from '@oslojs/webauthn';
import { ECDSAPublicKey, p256 } from '@oslojs/crypto/ecdsa';
import { RSAPublicKey } from '@oslojs/crypto/rsa';
import type { RequestHandler } from './$types';
import { redis } from '$lib/db/redis';
import { TimeSpan } from 'oslo';
import { error, json } from '@sveltejs/kit';
import { PUBLIC_APP_DOMAIN, PUBLIC_APP_ORIGIN } from '$env/static/public';
import { passkeyRegistrationSchema } from './schema';
import { base64, encodeHex } from 'oslo/encoding';
import { getRandomValues } from 'crypto';
import { sha256 } from 'oslo/crypto';

/**
 * Client hits this endpoint to request a challenge. The client will then send the challenge back
 * to us to validate.
 */
export const PUT: RequestHandler = async (event) => {
  const session = event.locals.session;
  if (!session) {
    return error(401);
  }

  const token = getRandomValues(new Uint8Array(32));
  const tokenHash = encodeHex(await sha256(token));

  await redis.main.set(`passkey-challenge: ${session.id}`, tokenHash, {
    EX: new TimeSpan(5, 'm').seconds()
  });

  return json({
    challenge: base64.encode(token)
  });
};

export const POST: RequestHandler = async (event) => {
  const session = event.locals.session;
  if (!session) {
    return error(401);
  }

  const passkeyRegistration = await event.request.json();
  if (!passkeyRegistrationSchema.safeParse(passkeyRegistration).success) {
    return error(415);
  }

  const encodedAttestationObject = base64.decode(passkeyRegistration.attestationObject);
  const clientDataJSON = base64.decode(passkeyRegistration.clientDataJSON);

  const { attestationStatement, authenticatorData } =
    parseAttestationObject(encodedAttestationObject);
  if (attestationStatement.format !== AttestationStatementFormat.None) {
    return error(406, { message: 'Invalid attestation statement format' });
  }

  if (!authenticatorData.verifyRelyingPartyIdHash(PUBLIC_APP_DOMAIN)) {
    return error(406, { message: 'Invalid relying party ID hash' });
  } else if (!authenticatorData.userPresent || !authenticatorData.userVerified) {
    return error(406, { message: 'User must be present and verified' });
  } else if (authenticatorData.credential === null) {
    return error(406, { message: 'Missing credential' });
  }

  const algorithm = authenticatorData.credential.publicKey.algorithm();
  if (!algorithm || (algorithm !== coseAlgorithmES256 && algorithm !== coseAlgorithmRS256)) {
    return error(406, { message: 'Unsupported algorithm' });
  }
  // Parse the COSE key depending on the algorithm. The structure depends on the algorithm.
  let cosePublicKey: COSEEC2PublicKey | COSERSAPublicKey;
  if (algorithm === coseAlgorithmES256) {
    cosePublicKey = authenticatorData.credential.publicKey.ec2();
    if (cosePublicKey.curve !== coseEllipticCurveP256) {
      return error(406, { message: 'Unsupported algorithm' });
    }
  } else {
    cosePublicKey = authenticatorData.credential.publicKey.rsa();
  }

  const clientData = parseClientDataJSON(clientDataJSON);
  if (clientData.type !== ClientDataType.Create) {
    return error(406, { message: 'Invalid client data type' });
  } else if (clientData.origin !== PUBLIC_APP_ORIGIN || clientData.crossOrigin) {
    return error(406, { message: 'Invalid origin' });
  }

  const redisQuery = `passkey-challenge: ${session.id}`;
  const clientChallengeHash = encodeHex(await sha256(clientData.challenge));
  const challengeHash = await redis.main.get(redisQuery);
  if (!challengeHash) {
    return error(404);
  } else if (challengeHash !== clientChallengeHash) {
    return error(406, { message: 'Invalid challenge' });
  }
  await redis.main.del(redisQuery);

  const credentialId = authenticatorData.credential.id;
  const encodedPublicKey =
    algorithm === coseAlgorithmES256
      ? new ECDSAPublicKey(
          p256,
          (cosePublicKey as COSEEC2PublicKey).x,
          (cosePublicKey as COSEEC2PublicKey).y
        ).encodePKIXUncompressed()
      : new RSAPublicKey(
          (cosePublicKey as COSERSAPublicKey).n,
          (cosePublicKey as COSERSAPublicKey).e
        ).encodePKIX();

  // TODO: store credentialId, public key, and algorithm with the user's id

  return json({
    success: true
  });
};
