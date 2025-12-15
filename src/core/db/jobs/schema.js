import { integer, pgTable, text, timestamp, varchar } from 'drizzle-orm/pg-core';

export const jobs = pgTable('jobs', {
  job_id: integer('job_id').generatedAlwaysAsIdentity().primaryKey(),
  job_title: varchar('job_title', { length: 255 }).notNull(),
  department: varchar('department', { length: 100 }),
  location: varchar('location', { length: 100 }),
  description: text('description'),
  created_at: timestamp('created_at').defaultNow(),
  status: varchar('status', { length: 50 }).default('Open'),
});
