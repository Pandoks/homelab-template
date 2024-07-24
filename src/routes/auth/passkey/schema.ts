import { base64Schema } from '$lib/zod';
import { z } from 'zod';

export const passkeyRegistrationSchema = z.object({
  clientDataJSON: base64Schema,
  attestationObject: base64Schema
});
