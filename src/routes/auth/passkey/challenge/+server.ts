import { handleAlreadyLoggedIn } from '$lib/auth/server';
import { generateIdFromEntropySize, TimeSpan } from 'lucia';
import type { RequestHandler } from './$types';
import { getRandomValues } from 'crypto';
import { base64url, encodeHex } from 'oslo/encoding';
import { sha256 } from 'oslo/crypto';
import { redis } from '$lib/db/server/redis';
import { json } from '@sveltejs/kit';

/**
 * Client hits this endpoint to request a challenge and an id for the challenge.
 */
export const POST: RequestHandler = async (event) => {
  handleAlreadyLoggedIn(event);

  const id = generateIdFromEntropySize(25);
  const token = getRandomValues(new Uint8Array(32));
  const tokenHash = encodeHex(await sha256(token));

  await redis.main.instance.set(`passkey-challenge:${id}`, tokenHash, {
    EX: new TimeSpan(5, 'm').seconds()
  });

  return json({
    id: id,
    userId: base64url.encode(getRandomValues(new Uint8Array(32))),
    challenge: base64url.encode(token)
  });
};
