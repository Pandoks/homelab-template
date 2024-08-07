import { relations } from 'drizzle-orm';
import { boolean, pgTable, text } from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';
import { emailVerifications, passkeys, sessions, twoFactorAuthenticationCredentials } from './auth';

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  username: text('username').notNull().unique(),
  passwordHash: text('password_hash')
});
/** TODO: when checks get released in Drizzle ORM, add check for password.
 * Password can only be null if the user has at least a single passkey
 */
export type User = typeof users.$inferSelect;
export const insertUserSchema = createInsertSchema(users);
export const userRelations = relations(users, ({ one, many }) => ({
  sessions: many(sessions),
  emailVerificationCode: one(emailVerifications),
  passkeys: many(passkeys),
  twoFactorAuthenticationCredential: one(twoFactorAuthenticationCredentials)
}));

export const emails = pgTable('emails', {
  email: text('email').primaryKey(),
  isVerified: boolean('is_verified').default(false),
  userId: text('user_id').references(() => users.id)
});
export const emailRelations = relations(emails, ({ one }) => ({
  user: one(users, {
    fields: [emails.userId],
    references: [users.id]
  })
}));
