import { eq } from 'drizzle-orm';
import { alphabet, generateRandomString } from 'oslo/crypto';
import { createDate, isWithinExpirationDate, TimeSpan } from 'oslo';
import { db } from '$lib/db';
import { emailVerificationCodes } from '$lib/db/schema/auth';
import { type User } from 'lucia';

export const generateEmailVerificationCode = async ({
	userId,
	email
}: {
	userId: string;
	email: string;
}): Promise<string> => {
	await db.delete(emailVerificationCodes).where(eq(emailVerificationCodes.userId, userId));

	const code = generateRandomString(6, alphabet('0-9', 'A-Z'));
	await db.insert(emailVerificationCodes).values({
		userId: userId,
		email: email,
		code: code,
		expiresAt: createDate(new TimeSpan(15, 'm'))
	});

	return code;
};

export const sendVerificationCode = async ({
	email,
	verificationCode
}: {
	email: string;
	verificationCode: string;
}) => {
	console.log(`Sending verification code: ${email}`);
	console.log(`Verification code: ${verificationCode}`);
};

export const verifyVerificationCode = async ({ user, code }: { user: User; code: string }) => {
	const isValidVerificationCode: boolean = await db.transaction(async (transaction) => {
		const [emailVerificationCode] = await transaction
			.select()
			.from(emailVerificationCodes)
			.where(eq(emailVerificationCodes.userId, user.id));
		if (!emailVerificationCode || emailVerificationCode.code !== code) {
			transaction.rollback();
			return false;
		}
		await transaction
			.delete(emailVerificationCodes)
			.where(eq(emailVerificationCodes.id, emailVerificationCode.id));

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
