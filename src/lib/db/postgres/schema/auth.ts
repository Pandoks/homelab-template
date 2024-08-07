import { boolean, pgTable, serial, smallint, text, timestamp } from 'drizzle-orm/pg-core';
import { emails, users } from './index';
import { relations } from 'drizzle-orm';

// TODO: setup cron job to clear invalid sessions with lucia
export const sessions = pgTable('sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  expiresAt: timestamp('expires_at', {
    withTimezone: true,
    mode: 'date'
  }).notNull(),
  isTwoFactorVerified: boolean('is_two_factor_verified').notNull().default(false),
  isPasskeyVerified: boolean('is_passkey_verified').notNull().default(false)
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
    .references(() => users.id, { onDelete: 'cascade' }),
  email: text('email')
    .notNull()
    .references(() => emails.email),
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
    .references(() => users.id, { onDelete: 'cascade' }),
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
    .references(() => users.id, { onDelete: 'cascade' })
});
export const passkeyRelations = relations(passkeys, ({ one }) => ({
  user: one(users, {
    fields: [passkeys.userId],
    references: [users.id]
  })
}));

export const twoFactorAuthenticationCredentials = pgTable('two_factor_authentication_credentials', {
  userId: text('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  twoFactorSecret: text('two_factor_secret'),
  twoFactorRecoveryHash: text('two_factor_recovery_hash'),
  activated: boolean('activated').default(false).notNull()
});
export const twoFactorAuthenticationCredentialRelations = relations(
  twoFactorAuthenticationCredentials,
  ({ one }) => ({
    user: one(users, {
      fields: [twoFactorAuthenticationCredentials.userId],
      references: [users.id]
    })
  })
);
