import { and, eq, sql } from "drizzle-orm";
import { alphabet, generateRandomString } from "oslo/crypto";
import { createDate, isWithinExpirationDate, TimeSpan } from "oslo";
import { type User } from "lucia";
import { database } from "../../database/main";
import { emailVerifications } from "../../database/main/schema/auth.sql";
import { emails, users } from "../../database/main/schema/user.sql";

// TODO: make everything only handle lowercase username and email
export const generateEmailVerification = async ({
  userId,
  email,
}: {
  userId: string;
  email: string;
}): Promise<string> => {
  const code = generateRandomString(6, alphabet("0-9", "A-Z"));
  await database.transaction(async (tsx) => {
    await tsx.execute(sql`
      DELETE FROM ${emailVerifications}
      USING ${emails} 
      WHERE ${emailVerifications.email} = ${emails.email}
        AND ${emails.userId} = ${userId}
    `);
    await tsx.insert(emailVerifications).values({
      email: email,
      code: code,
      expiresAt: createDate(new TimeSpan(15, "m")),
    });
  });

  return code;
};

export const sendVerification = async ({
  email,
  code,
}: {
  email: string;
  code: string;
}) => {
  console.log(`Sending verification code: ${email}`);
  console.log(`Verification code: ${code}`);
};

export const verifyVerificationCode = async ({
  user,
  code,
}: {
  user: User;
  code: string;
}) => {
  return await database.transaction(async (tsx) => {
    const [emailVerificationCode] = await tsx
      .select({
        code: emailVerifications.code,
        id: emailVerifications.id,
        expiresAt: emailVerifications.expiresAt,
        email: emailVerifications.email,
      })
      .from(emailVerifications)
      .innerJoin(emails, eq(emails.email, emailVerifications.email))
      .innerJoin(users, and(eq(users.id, user.id), eq(users.id, emails.userId)))
      .limit(1);
    if (!emailVerificationCode || emailVerificationCode.code !== code) {
      return false;
    }

    await tsx
      .delete(emailVerifications)
      .where(eq(emailVerifications.id, emailVerificationCode.id));

    if (
      !isWithinExpirationDate(emailVerificationCode.expiresAt) ||
      emailVerificationCode.email !== user.email
    ) {
      return false;
    }

    return true;
  });
};
