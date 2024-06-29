import { pgTable, text } from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';

export const users = pgTable('users', {
	id: text('id').primaryKey(),
	firstName: text('first_name'),
	lastName: text('last_name'),
	username: text('username').unique(),
	passwordHash: text('password_hash')
});

export const insertUserSchema = createInsertSchema(users);
export const selectUserSchema = createSelectSchema(users);
