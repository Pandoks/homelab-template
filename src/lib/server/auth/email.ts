import { eq } from 'drizzle-orm';
import { alphabet, generateRandomString } from 'oslo/crypto';
import { createDate, TimeSpan } from 'oslo';
import { db } from '$lib/db';
import { emailVerificationCodes } from '$lib/db/schema/auth';

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
	console.log('Sending verification code');
};
