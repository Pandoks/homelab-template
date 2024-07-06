import { z } from 'zod';
import { emailSchema, passwordSchema, usernameSchema } from '../schema';

export const signupSchema = z.object({
	username: usernameSchema,
	email: emailSchema,
	password: passwordSchema
});
export type SignupSchema = typeof signupSchema;
