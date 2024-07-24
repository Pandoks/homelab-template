import { base64Schema } from '$lib/zod';
import { z } from 'zod';

export const passkeyRegistrationSchema = z.object({
  clientDataJSON: base64Schema,
  attestationObject: base64Schema
});

export const passkeyAuthenticationSchema = z.object({
  credentialId: base64Schema,
  signature: base64Schema,
  authenticatorData: base64Schema,
  clientDataJSON: base64Schema
});
