import { relations } from 'drizzle-orm';
import { boolean, pgTable, text } from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';
import { emailVerificationCodes, sessions } from './auth';

export const users = pgTable('users', {
	id: text('id').primaryKey(),
	username: text('username').notNull().unique(),
	email: text('email').notNull().unique(),
	passwordHash: text('password_hash').notNull(),
	isEmailVerified: boolean('is_email_verified').default(false),
	twoFactorSecret: text('two_factor_secret'),
	twoFactorRecoveryHash: text('two_factor_recovery_hash')
});
export type User = typeof users.$inferSelect;
export const insertUserSchema = createInsertSchema(users);
export const userRelations = relations(users, ({ one, many }) => ({
	sessions: many(sessions),
	emailVerificationCode: one(emailVerificationCodes)
}));
