import {
  boolean,
  pgTable,
  serial,
  smallint,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { emails, users } from "./user.sql";
import { type InferSelectModel, relations } from "drizzle-orm";

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", {
    withTimezone: true,
    mode: "date",
  }).notNull(),
  isTwoFactorVerified: boolean("is_two_factor_verified")
    .notNull()
    .default(false),
  isPasskeyVerified: boolean("is_passkey_verified").notNull().default(false),
});
export const sessionRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));
export type Session = InferSelectModel<typeof sessions>;

export const emailVerifications = pgTable("email_verifications", {
  id: serial("id").primaryKey(),
  code: text("code").notNull(),
  email: text("email")
    .notNull()
    .references(() => emails.email, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { mode: "date" }).notNull(),
});
export const emailVerificationCodeRelations = relations(
  emailVerifications,
  ({ one }) => ({
    email: one(emails, {
      fields: [emailVerifications.email],
      references: [emails.email],
    }),
  }),
);

export const passwordResets = pgTable("password_resets", {
  tokenHash: text("token_hash").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { mode: "date" }).notNull(),
});
export const passwordResetTokenRelations = relations(
  passwordResets,
  ({ one }) => ({
    user: one(users, {
      fields: [passwordResets.userId],
      references: [users.id],
    }),
  }),
);

export const passkeys = pgTable("passkeys", {
  credentialId: text("credential_id").notNull().primaryKey(),
  name: text("name").default(""),
  algorithm: smallint("algorithm").notNull(),
  encodedPublicKey: text("encoded_public_key").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
});
export const passkeyRelations = relations(passkeys, ({ one }) => ({
  user: one(users, {
    fields: [passkeys.userId],
    references: [users.id],
  }),
}));

export const twoFactorAuthenticationCredentials = pgTable(
  "two_factor_authentication_credentials",
  {
    userId: text("user_id")
      .primaryKey()
      .references(() => users.id, { onDelete: "cascade" }),
    twoFactorKey: text("two_factor_secret"),
    twoFactorRecoveryHash: text("two_factor_recovery_hash"),
    activated: boolean("activated").default(false).notNull(),
  },
);
export const twoFactorAuthenticationCredentialRelations = relations(
  twoFactorAuthenticationCredentials,
  ({ one }) => ({
    user: one(users, {
      fields: [twoFactorAuthenticationCredentials.userId],
      references: [users.id],
    }),
  }),
);
