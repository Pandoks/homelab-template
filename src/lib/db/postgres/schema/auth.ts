import { boolean, pgEnum, pgTable, serial, smallint, text, timestamp } from 'drizzle-orm/pg-core';
import { users } from './index';
import { relations } from 'drizzle-orm';
import { coseAlgorithmES256, coseAlgorithmRS256 } from '@oslojs/webauthn';

// TODO: setup cron job to clear invalid sessions with lucia
export const sessions = pgTable('sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id),
  expiresAt: timestamp('expires_at', {
    withTimezone: true,
    mode: 'date'
  }).notNull(),
  isTwoFactorVerified: boolean('is_two_factor_verified').notNull().default(false)
});
export const sessionRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id]
  })
}));

export const emailVerifications = pgTable('email_verifications', {
  id: serial('id').primaryKey(),
  code: text('code'),
  userId: text('user_id')
    .notNull()
    .references(() => users.id),
  email: text('email')
    .notNull()
    .references(() => users.email),
  expiresAt: timestamp('expires_at', { mode: 'date' }).notNull()
});
export const emailVerificationCodeRelations = relations(emailVerifications, ({ one }) => ({
  user: one(users, {
    fields: [emailVerifications.userId],
    references: [users.id]
  })
}));

export const passwordResets = pgTable('password_resets', {
  tokenHash: text('token_hash').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id),
  expiresAt: timestamp('expires_at', { mode: 'date' }).notNull()
});
export const passwordResetTokenRelations = relations(passwordResets, ({ one }) => ({
  user: one(users, {
    fields: [passwordResets.userId],
    references: [users.id]
  })
}));

export const passkeys = pgTable('passkeys', {
  credentialId: text('credential_id').notNull().primaryKey(),
  name: text('name').default(''),
  algorithm: smallint('algorithm').notNull(),
  encodedPublicKey: text('encoded_public_key').notNull(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id)
});
export const passkeyRelations = relations(passkeys, ({ one }) => ({
  user: one(users, {
    fields: [passkeys.userId],
    references: [users.id]
  })
}));
