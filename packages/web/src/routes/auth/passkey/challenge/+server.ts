import { handleAlreadyLoggedIn } from '$lib/auth/server';
import type { RequestHandler } from './$types';
import { getRandomValues } from 'crypto';
import { json } from '@sveltejs/kit';
import { redis as mainRedis } from '@startup-template/core/redis/main/index';
import {
  encodeBase32LowerCaseNoPadding,
  encodeBase64url,
  encodeHexLowerCase
} from '@oslojs/encoding';
import { sha256 } from '@oslojs/crypto/sha2';
import { TimeSpan } from '@startup-template/core/util/time';

/**
 * Client hits this endpoint to request a challenge and an id for the challenge.
 */
export const POST: RequestHandler = async (event) => {
  handleAlreadyLoggedIn(event);

  const id = encodeBase32LowerCaseNoPadding(crypto.getRandomValues(new Uint8Array(25))); // 40 characters
  const token = getRandomValues(new Uint8Array(32));
  const tokenHash = encodeHexLowerCase(sha256(token));

  await mainRedis.set(`passkey-challenge:${id}`, tokenHash, {
    EX: new TimeSpan(5, 'm').seconds()
  });

  return json({
    id: id,
    userId: encodeBase64url(getRandomValues(new Uint8Array(32))),
    challenge: encodeBase64url(token)
  });
};
