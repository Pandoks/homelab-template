import { z } from 'zod';

export const twoFactorSetupSchema = z.object({
  otp: z.string().length(6)
});
export type TwoFactorSetupSchema = typeof twoFactorSetupSchema;
