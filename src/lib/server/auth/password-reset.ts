import { db } from '$lib/db';
import { passwordResetTokens } from '$lib/db/schema/auth';
import { eq } from 'drizzle-orm';
import { generateIdFromEntropySize } from 'lucia';
import { createDate, TimeSpan } from 'oslo';
import { sha256 } from 'oslo/crypto';
import { encodeHex } from 'oslo/encoding';

// Token should be valid for at most a few hours
// Token should be hashed before storage as it's essentially a password
// SHA256 because token is long and random unlike use passwords
export const createPasswordResetToken = async ({ userId }: { userId: string }): Promise<string> => {
  await db.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, userId)); // invalidate existing tokens
  const token = generateIdFromEntropySize(25); // 40 characters
  const tokenHash = encodeHex(await sha256(new TextEncoder().encode(token)));
  const [passwordResetToken] = await db
    .insert(passwordResetTokens)
    .values({ tokenHash: tokenHash, userId: userId, expiresAt: createDate(new TimeSpan(2, 'h')) })
    .onConflictDoNothing()
    .returning();

  if (!passwordResetToken) {
    return '';
  }

  return token;
};

export const sendPasswordReset = async ({
  email,
  verificationLink
}: {
  email: string;
  verificationLink: string;
}) => {
  console.log(`Sending verification code: ${email}`);
  console.log(`Verification link: ${verificationLink}`);
};
