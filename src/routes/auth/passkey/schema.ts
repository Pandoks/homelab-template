import { base64UrlSchema } from '$lib/zod';
import { z } from 'zod';

export const passkeyRegistrationSchema = z.object({
  id: z.string(),
  name: z.string(),
  clientDataJSON: base64UrlSchema,
  attestationObject: base64UrlSchema
});
