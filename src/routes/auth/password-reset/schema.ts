import { z } from 'zod';
import { emailSchema } from '../schema';

export const passwordResetSchema = z.object({
  email: emailSchema
});
export type PasswordResetSchema = typeof passwordResetSchema;
