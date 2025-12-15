import { integer, pgTable, text, timestamp, varchar } from 'drizzle-orm/pg-core';
import { jobApplications } from '../applications/schema.js';

export const recruiterComments = pgTable('recruiter_comments', {
  comment_id: integer('comment_id').generatedAlwaysAsIdentity().primaryKey(),
  application_id: integer('application_id')
    .references(() => jobApplications.application_id, { onDelete: 'cascade' })
    .notNull(),
  author: varchar('author', { length: 255 }).notNull(),
  comment_text: text('comment_text').notNull(),
  created_at: timestamp('created_at').defaultNow(),
});
