/**
 * Users can register a passkey or login with a passkey. Users CANNOT signup with a passkey, so passkeys
 * will only be used when the user already has an account so we can always check if the the user exists
 * as a sanity check and couple passkey challenges with users.
 *
 * NOTE: there should never be a situation where you create a passkey challenge and there is no user
 * to couple that challenge with.
 */
import {
  AttestationStatementFormat,
  ClientDataType,
  coseAlgorithmES256,
  coseAlgorithmRS256,
  coseEllipticCurveP256,
  createAssertionSignatureMessage,
  parseAttestationObject,
  parseAuthenticatorData,
  parseClientDataJSON,
  type COSEEC2PublicKey,
  type COSERSAPublicKey
} from '@oslojs/webauthn';
import {
  ECDSAPublicKey,
  p256,
  decodeSEC1PublicKey,
  verifyECDSASignature,
  decodePKIXECDSASignature
} from '@oslojs/crypto/ecdsa';
import {
  decodePKCS1RSAPublicKey,
  RSAPublicKey,
  sha256ObjectIdentifier,
  verifyRSASSAPKCS1v15Signature
} from '@oslojs/crypto/rsa';
import type { RequestHandler } from './$types';
import { redis } from '$lib/db/redis';
import { TimeSpan } from 'oslo';
import { error, json } from '@sveltejs/kit';
import { PUBLIC_APP_DOMAIN, PUBLIC_APP_ORIGIN } from '$env/static/public';
import {
  passkeyAuthenticationSchema,
  passkeyChallengeRequestSchema,
  passkeyRegistrationSchema
} from './schema';
import { base64, encodeHex } from 'oslo/encoding';
import { getRandomValues } from 'crypto';
import { sha256 } from 'oslo/crypto';
import { db } from '$lib/db/postgres';
import { passkeys } from '$lib/db/postgres/schema/auth';
import { eq } from 'drizzle-orm';
import { users } from '$lib/db/postgres/schema';
import { handleAlreadyLoggedIn } from '$lib/auth/server';
import { sha256 as syncSha256 } from '@oslojs/crypto/sha2';

/**
 * Client hits this endpoint to request a challenge. User must already exist, but the user does NOT
 * need to be logged in. This endpoint should be accessible to both logged in and logged out users.
 */
export const PUT: RequestHandler = async (event) => {
  handleAlreadyLoggedIn(event);

  const passkeyChallengeRequest = await event.request.json();
  if (!passkeyChallengeRequestSchema.safeParse(passkeyChallengeRequest).success) {
    return error(415);
  }

  const [userInfo] = await db
    .select()
    .from(users)
    .where(eq(users.username, passkeyChallengeRequest.username))
    .limit(1);
  if (!userInfo) {
    return error(415);
  }

  const token = getRandomValues(new Uint8Array(32));
  const tokenHash = encodeHex(await sha256(token));

  await redis.main.set(`passkey-challenge:${userInfo.username}`, tokenHash, {
    EX: new TimeSpan(5, 'm').seconds()
  });

  return json({
    challenge: base64.encode(token)
  });
};

/**
 * Client hits this endpoint to register a new passkey (register). User must be logged in already.
 */
export const POST: RequestHandler = async (event) => {
  handleAlreadyLoggedIn(event);
  const user = event.locals.user;
  if (!user) {
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

  const redisQuery = `passkey-challenge:${user.username}`;
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
        ).encodeSEC1Uncompressed()
      : new RSAPublicKey(
          (cosePublicKey as COSERSAPublicKey).n,
          (cosePublicKey as COSERSAPublicKey).e
        ).encodePKCS1();

  try {
    const databaseInfo = {
      credentialId: base64.encode(credentialId),
      algorithm: algorithm,
      encodedPublicKey: base64.encode(encodedPublicKey),
      userId: user.id
    };
    await db.insert(passkeys).values(databaseInfo);
  } catch (err) {
    return error(500);
  }

  return json({
    success: true
  });
};

/**
 * Client hits this endpoint to authenticate a passkey (login)
 */
export const PATCH: RequestHandler = async (event) => {
  handleAlreadyLoggedIn(event);

  const passkeyAuthentication = await event.request.json();
  if (!passkeyAuthenticationSchema.safeParse(passkeyAuthentication).success) {
    return error(415);
  }

  const credentialId = passkeyAuthentication.credentialId;
  const signature = base64.decode(passkeyAuthentication.signature);
  const encodedAuthenticatorData = base64.decode(passkeyAuthentication.encodedAuthenticatorData);
  const clientDataJSON = base64.decode(passkeyAuthentication.clientDataJSON);

  const authenticatorData = parseAuthenticatorData(encodedAuthenticatorData);
  if (!authenticatorData.verifyRelyingPartyIdHash(PUBLIC_APP_DOMAIN)) {
    return error(406, { message: 'Invalid relying party ID hash' });
  } else if (!authenticatorData.userPresent || !authenticatorData.userVerified) {
    return error(406, { message: 'User must be present and verified' });
  }

  const clientData = parseClientDataJSON(clientDataJSON);
  if (clientData.type !== ClientDataType.Get) {
    return error(406, { message: 'Invalid client data type' });
  } else if (clientData.origin !== PUBLIC_APP_ORIGIN || clientData.crossOrigin) {
    return error(406, { message: 'Invalid origin' });
  }

  const redisQuery = `passkey-challenge:${passkeyAuthentication.username}`;
  const clientChallengeHash = encodeHex(await sha256(clientData.challenge));
  const challengeHash = await redis.main.get(redisQuery);
  if (!challengeHash) {
    return error(404);
  } else if (challengeHash !== clientChallengeHash) {
    return error(406, { message: 'Invalid challenge' });
  }
  await redis.main.del(redisQuery);

  const [passkeyInfo] = await db
    .select()
    .from(passkeys)
    .where(eq(passkeys.credentialId, credentialId))
    .limit(1);
  if (!passkeyInfo) {
    return error(404);
  }

  let valid = false;
  if (
    passkeyInfo.algorithm === coseAlgorithmES256 &&
    authenticatorData.credential?.publicKey.algorithm() === coseAlgorithmES256
  ) {
    const ecdsaPublicKey = decodeSEC1PublicKey(p256, base64.decode(passkeyInfo.encodedPublicKey));
    const hash = syncSha256(
      createAssertionSignatureMessage(encodedAuthenticatorData, clientDataJSON)
    );
    // Decode DER-encoded signature
    const ecdsaSignature = decodePKIXECDSASignature(signature);
    valid = verifyECDSASignature(ecdsaPublicKey, hash, ecdsaSignature);
  } else if (
    passkeyInfo.algorithm === coseAlgorithmRS256 &&
    authenticatorData.credential?.publicKey.algorithm()
  ) {
    const rsaPublicKey = decodePKCS1RSAPublicKey(base64.decode(passkeyInfo.encodedPublicKey));
    const hash = syncSha256(
      createAssertionSignatureMessage(encodedAuthenticatorData, clientDataJSON)
    );
    valid = verifyRSASSAPKCS1v15Signature(rsaPublicKey, sha256ObjectIdentifier, hash, signature);
  } else {
    return error(409);
  }
  if (!valid) {
    return error(400);
  }

  return json({
    success: true
  });
};
