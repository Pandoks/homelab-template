import { generateIdFromEntropySize } from 'lucia';
import type { RequestHandler } from './$types';
import { base32, encodeHex } from 'oslo/encoding';
import { sha256 } from 'oslo/crypto';
import { redis } from '$lib/db/redis';
import { TimeSpan } from 'oslo';
import { WebAuthnController, type AttestationResponse } from 'oslo/webauthn';
import { json } from '@sveltejs/kit';
import { PUBLIC_APP_HOST } from '$env/static/public';
import { passkeyRegistrationSchema } from './schema';
import { base64 } from 'oslo/encoding';
import { decode } from 'cbor-x';

/**
 * Client hits this endpoint to request a challenge. The client will then send the challenge back
 * to us to validate.
 */
export const PUT: RequestHandler = async (event) => {
  const session = event.locals.session;
  if (!session) {
    return new Response(null, { status: 401 });
  }

  const token = generateIdFromEntropySize(25); // base32
  const tokenHash = encodeHex(await sha256(new TextEncoder().encode(token)));

  await redis.main.set(`passkey-challenge: ${session.userId}`, tokenHash, {
    EX: new TimeSpan(5, 'm').seconds()
  });

  return json({
    challenge: token
  });
};

export const POST: RequestHandler = async (event) => {
  const session = event.locals.session;
  if (!session) {
    return new Response(null, { status: 401 });
  }

  const passkeyRegistration = await event.request.json();
  if (!passkeyRegistrationSchema.safeParse(passkeyRegistration).success) {
    return new Response(null, { status: 415 });
  }

  const clientDataJSON = base64.decode(passkeyRegistration.response.clientDataJSON).buffer;
  // encoded with CBOR
  const cborAttestationObject = base64.decode(passkeyRegistration.response.attestationObject);
  /**
   * AttestationObject {
   *  Fmt: string // fmt
   *  AttestationStatement: // depends on specs https://www.w3.org/TR/webauthn-2/#sctn-defined-attestation-formats
   *  AuthenticatorData: byte[]
   * }
   */
  const attestationObject = decode(cborAttestationObject);
  if (attestationObject.fmt !== 'none') {
    return new Response(null, { status: 406 });
  }

  const attestationResponse: AttestationResponse = {
    clientDataJSON: clientDataJSON,
    authenticatorData: attestationObject.authenticatorData
  };

  const challenge = base32.decode(passkeyRegistration.challenge);

  const webAuthnController = new WebAuthnController(PUBLIC_APP_HOST);
  try {
    await webAuthnController.validateAttestationResponse(attestationResponse, challenge);
  } catch (err) {
    console.error(err);
    return new Response(null, { status: 500 });
  }

  return json({
    success: true
  });
};
