import { integer, pgTable, timestamp, varchar } from 'drizzle-orm/pg-core';

export const recruiters = pgTable('recruiters', {
  recruiter_id: integer('recruiter_id').generatedAlwaysAsIdentity().primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  password_hash: varchar('password_hash', { length: 255 }).notNull(),
  full_name: varchar('full_name', { length: 255 }).notNull(),
  role: varchar('role', { length: 50 }).default('recruiter'),
  created_at: timestamp('created_at').defaultNow(),
});
