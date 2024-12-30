import { z } from 'zod';
import { emailSchema, passwordSchema, usernameSchema } from '../schema';
import { base64UrlSchema } from '$lib/zod';

export const signupSchema = z.object({
  username: usernameSchema,
  email: emailSchema,
  password: passwordSchema
});
export type SignupSchema = typeof signupSchema;

export const signupPasskeySchema = z.object({
  username: usernameSchema,
  email: emailSchema,
  challengeId: z.string(),
  clientDataJSON: base64UrlSchema,
  attestationObject: base64UrlSchema
});
export type SignupPasskeySchema = typeof signupPasskeySchema;
