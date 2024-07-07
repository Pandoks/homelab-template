import { z } from 'zod';
import { emailSchema, passwordSchema, usernameSchema } from '../schema';

export const loginSchema = z.object({
  usernameOrEmail: z.union([usernameSchema, emailSchema]),
  password: passwordSchema
});
export type LoginFormSchema = typeof loginSchema;
