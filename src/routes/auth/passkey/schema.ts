import { base64UrlSchema } from '$lib/zod';
import { z } from 'zod';

export const passkeyRegistrationSchema = z.object({
  challengeId: z.string(),
  name: z.string(),
  clientDataJSON: base64UrlSchema,
  attestationObject: base64UrlSchema
});
