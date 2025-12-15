import { integer, pgTable, timestamp } from 'drizzle-orm/pg-core';
import { jobApplications } from '../applications/schema.js';

export const oneWayInterviews = pgTable('one_way_interviews', {
  one_way_interview_id: integer('one_way_interview_id').generatedAlwaysAsIdentity().primaryKey(),
  application_id: integer('application_id')
    .references(() => jobApplications.application_id, { onDelete: 'cascade' })
    .notNull(),
  recorded_at: timestamp('recorded_at').defaultNow(),
});
