import { eq } from 'drizzle-orm';
import { alphabet, generateRandomString } from 'oslo/crypto';
import { createDate, isWithinExpirationDate, TimeSpan } from 'oslo';
import { db } from '$lib/db';
import { emailVerifications } from '$lib/db/schema/auth';
import { type User } from 'lucia';

export const generateEmailVerification = async ({
  userId,
  email
}: {
  userId: string;
  email: string;
}): Promise<string> => {
  await db.delete(emailVerifications).where(eq(emailVerifications.userId, userId));

  const code = generateRandomString(6, alphabet('0-9', 'A-Z'));
  await db.insert(emailVerifications).values({
    userId: userId,
    email: email,
    code: code,
    expiresAt: createDate(new TimeSpan(15, 'm'))
  });

  return code;
};

export const sendVerification = async ({ email, code }: { email: string; code: string }) => {
  console.log(`Sending verification code: ${email}`);
  console.log(`Verification code: ${code}`);
};

export const verifyVerificationCode = async ({ user, code }: { user: User; code: string }) => {
  const isValidVerificationCode: boolean = await db.transaction(async (transaction) => {
    const [emailVerificationCode] = await transaction
      .select()
      .from(emailVerifications)
      .where(eq(emailVerifications.userId, user.id));
    if (!emailVerificationCode || emailVerificationCode.code !== code) {
      transaction.rollback();
      return false;
    }
    await transaction
      .delete(emailVerifications)
      .where(eq(emailVerifications.id, emailVerificationCode.id));

    if (
      isWithinExpirationDate(emailVerificationCode.expiresAt) ||
      emailVerificationCode.email !== user.email
    ) {
      return false;
    }

    return true;
  });

  return isValidVerificationCode;
};
