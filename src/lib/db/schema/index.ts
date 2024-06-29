import { relations } from 'drizzle-orm';
import { boolean, pgTable, text } from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';
import { emailVerificationCodes, sessions } from '$lib/db/schema/auth';

export const users = pgTable('users', {
	id: text('id').primaryKey(),
	firstName: text('first_name'),
	lastName: text('last_name'),
	username: text('username').notNull().unique(),
	email: text('email').notNull().unique(),
	passwordHash: text('password_hash').notNull(),
	isEmailVerified: boolean('is_email_verified').default(false)
});
export type User = typeof users.$inferSelect;
export const insertUserSchema = createInsertSchema(users);
export const userRelations = relations(users, ({ one, many }) => ({
	sessions: many(sessions),
	emailVerificationCode: one(emailVerificationCodes)
}));
