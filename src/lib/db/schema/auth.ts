import { pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';
import { users } from './index';
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
  linkToken: text('link_token'),
  userId: text('user_id')
    .notNull()
    .references(() => users.id),
  email: text('email')
    .notNull()
    .references(() => users.email),
  expiresAt: timestamp('expires_at', { mode: 'date' }).notNull()
});
export const emailVerificationCodeRelations = relations(emailVerificationCodes, ({ one }) => ({
  user: one(users, {
    fields: [emailVerificationCodes.userId],
    references: [users.id]
  })
}));

export const passwordResetTokens = pgTable('password_reset_tokens', {
  tokenHash: text('token_hash').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id),
  expiresAt: timestamp('expires_at', { mode: 'date' }).notNull()
});
export const passwordResetTokenRelations = relations(passwordResetTokens, ({ one }) => ({
  user: one(users, {
    fields: [passwordResetTokens.userId],
    references: [users.id]
  })
}));
