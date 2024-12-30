import { z } from 'zod';

export const verificationSchema = z.object({
  code: z.string().max(6)
});
export type VerificationSchema = typeof verificationSchema;
