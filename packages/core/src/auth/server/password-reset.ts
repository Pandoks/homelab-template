import { eq } from "drizzle-orm";
import { database } from "../../database/main";
import { passwordResets } from "../../database/main/schema/auth.sql";
import {
  encodeBase32LowerCaseNoPadding,
  encodeHexLowerCase,
} from "@oslojs/encoding";
import { sha256 } from "@oslojs/crypto/sha2";
import { createDate, TimeSpan } from "@startup-template/core/util/time";

// Token should be valid for at most a few hours
// Token should be hashed before storage as it's essentially a password
// SHA256 because token is long and random unlike use passwords
export const createPasswordResetToken = async ({
  userId,
}: {
  userId: string;
}): Promise<string> => {
  const token = encodeBase32LowerCaseNoPadding(
    crypto.getRandomValues(new Uint8Array(25)),
  ); // 40 characters

  await database.transaction(async (tsx) => {
    const tokenHash = encodeHexLowerCase(
      sha256(new TextEncoder().encode(token)),
    );
    await tsx.delete(passwordResets).where(eq(passwordResets.userId, userId)); // invalidate existing tokens
    await tsx.insert(passwordResets).values({
      tokenHash: tokenHash,
      userId: userId,
      expiresAt: createDate(new TimeSpan(2, "h")),
    });
  });

  return token;
};

export const sendPasswordReset = async ({
  email,
  verificationLink,
}: {
  email: string;
  verificationLink: string;
}) => {
  console.log(`Sending verification code: ${email}`);
  console.log(`Verification link: ${verificationLink}`);
};
