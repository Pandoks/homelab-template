import { base64UrlSchema } from '$lib/zod';
import { z } from 'zod';

export const passkeyRegistrationSchema = z.object({
  id: z.string(),
  clientDataJSON: base64UrlSchema,
  attestationObject: base64UrlSchema
});

export const passkeyAuthenticationSchema = z.object({
  id: z.string(),
  credentialId: z.string(),
  signature: base64UrlSchema,
  encodedAuthenticatorData: base64UrlSchema,
  clientDataJSON: base64UrlSchema
});
