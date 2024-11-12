import { handleAlreadyLoggedIn } from '$lib/auth/server';
import type { RequestHandler } from './$types';
import { getRandomValues } from 'crypto';
import { json } from '@sveltejs/kit';
import { redis as mainRedis } from '@startup-template/core/redis/main/index';

/**
 * Client hits this endpoint to request a challenge and an id for the challenge.
 */
export const POST: RequestHandler = async (event) => {
  handleAlreadyLoggedIn(event);

  const id = generateIdFromEntropySize(25);
  const token = getRandomValues(new Uint8Array(32));
  const tokenHash = encodeHex(await sha256(token));

  await mainRedis.set(`passkey-challenge:${id}`, tokenHash, {
    EX: new TimeSpan(5, 'm').seconds()
  });

  return json({
    id: id,
    userId: base64url.encode(getRandomValues(new Uint8Array(32))),
    challenge: base64url.encode(token)
  });
};
