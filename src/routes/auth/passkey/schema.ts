import { base32Schema, base64Schema } from '$lib/zod';
import { z } from 'zod';

export const passkeyRegistrationSchema = z.object({
  response: z.object({
    clientDataJSON: base64Schema,
    attestationObject: base64Schema
  }),
  challenge: base32Schema
});
