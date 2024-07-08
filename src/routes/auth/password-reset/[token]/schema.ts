import { z } from 'zod';
import { passwordSchema } from '../../schema';

export const newPasswordSchema = z
  .object({
    password: passwordSchema,
    passwordConfirmation: z.string()
  })
  .refine((data) => data.password === data.passwordConfirmation, {
    message: 'Passwords must match',
    path: ['passwordConfirmation']
  });
export type NewPasswordSchema = typeof newPasswordSchema;
