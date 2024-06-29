import { date, pgTable, serial, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { users } from '$lib/db/schema/index';
import { relations } from 'drizzle-orm';

export const sessions = pgTable('sessions', {
	id: text('id').primaryKey(),
	userId: text('user_id')
		.notNull()
		.references(() => users.id),
	expiresAt: timestamp('expires_at', {
		withTimezone: true,
		mode: 'date'
	}).notNull()
});
export const sessionRelations = relations(sessions, ({ one }) => ({
	user: one(users, {
		fields: [sessions.userId],
		references: [users.id]
	})
}));

export const emailVerificationCodes = pgTable('email_verification_codes', {
	id: serial('id').primaryKey(),
	code: text('code'),
	userId: text('user_id')
		.notNull()
		.references(() => users.id),
	email: text('email')
		.notNull()
		.references(() => users.email),
	expiresAt: date('expires_at').notNull()
});
export const emailVerificationCodeRelations = relations(emailVerificationCodes, ({ one }) => ({
	user: one(users, {
		fields: [emailVerificationCodes.userId],
		references: [users.id]
	})
}));
