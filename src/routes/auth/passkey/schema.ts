import { base64Schema } from '$lib/zod';
import { z } from 'zod';

export const passkeyChallengeRequestSchema = z.object({
  username: z.string()
});

export const passkeyRegistrationSchema = z.object({
  clientDataJSON: base64Schema,
  attestationObject: base64Schema
});

export const passkeyAuthenticationSchema = z.object({
  credentialId: z.string(),
  signature: base64Schema,
  encodedAuthenticatorData: base64Schema,
  clientDataJSON: base64Schema
});
