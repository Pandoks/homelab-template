import { z } from 'zod';

export const twoFactorRecoverySchema = z.object({
  recoveryCode: z.string().regex(/^[a-zA-Z0-9]+$/) // alphabets + numbers only
});
export type TwoFactorRecoverySchema = typeof twoFactorRecoverySchema;
