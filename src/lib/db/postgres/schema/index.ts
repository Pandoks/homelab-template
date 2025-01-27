import { relations } from 'drizzle-orm';
import { boolean, pgTable, text } from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';
import { emailVerifications, passkeys, sessions } from './auth';

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  username: text('username').notNull().unique(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash'),
  isEmailVerified: boolean('is_email_verified').default(false),
  hasTwoFactor: boolean('has_two_factor').default(false),
  twoFactorSecret: text('two_factor_secret'),
  twoFactorRecoveryHash: text('two_factor_recovery_hash')
});
/** TODO: when checks get released in Drizzle ORM, add check for password.
 * Password can only be null if the user has at least a single passkey
 */
export type User = typeof users.$inferSelect;
export const insertUserSchema = createInsertSchema(users);
export const userRelations = relations(users, ({ one, many }) => ({
  sessions: many(sessions),
  emailVerificationCode: one(emailVerifications),
  passkeys: many(passkeys)
}));
