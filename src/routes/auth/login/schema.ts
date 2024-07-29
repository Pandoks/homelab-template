import { z } from 'zod';
import { emailSchema, passwordSchema, usernameSchema } from '../schema';
import { base64UrlSchema } from '$lib/zod';

export const loginSchema = z.object({
  usernameOrEmail: z.union([usernameSchema, emailSchema]),
  password: passwordSchema
});
export type LoginFormSchema = typeof loginSchema;

export const loginPasskeySchema = z.object({
  usernameOrEmail: z.union([usernameSchema, emailSchema]),
  challengeId: z.string(),
  credentialId: z.string(),
  signature: base64UrlSchema,
  encodedAuthenticatorData: base64UrlSchema,
  clientDataJSON: base64UrlSchema
});
export type LoginPasskeySchema = typeof loginPasskeySchema;
