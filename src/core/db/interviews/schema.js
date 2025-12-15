import { integer, pgTable, timestamp, varchar } from 'drizzle-orm/pg-core';
import { index } from 'drizzle-orm/pg-core';
import { jobApplications } from '../applications/schema.js';

export const interviews = pgTable(
  'interviews',
  {
    interview_id: integer('interview_id').generatedAlwaysAsIdentity().primaryKey(),
    application_id: integer('application_id')
      .references(() => jobApplications.application_id, { onDelete: 'cascade' })
      .notNull(),
    round_name: varchar('round_name', { length: 100 }).notNull(),
    interview_at: timestamp('interview_at').notNull(),
  },
  (table) => ({
    idxApplication: index('idx_interviews_application').on(table.application_id),
  })
);
