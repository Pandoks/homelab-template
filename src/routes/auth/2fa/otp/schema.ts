import { z } from 'zod';

export const oneTimePasswordSchema = z.object({
  otp: z.string().length(6)
});
export type OneTimePasswordSchema = typeof oneTimePasswordSchema;
