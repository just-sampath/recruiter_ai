import { integer, pgTable, timestamp, varchar } from 'drizzle-orm/pg-core';
import { index } from 'drizzle-orm/pg-core';
import { candidates } from '../candidates/schema.js';
import { jobs } from '../jobs/schema.js';

export const jobApplications = pgTable(
  'job_applications',
  {
    application_id: integer('application_id').generatedAlwaysAsIdentity().primaryKey(),
    candidate_id: integer('candidate_id')
      .references(() => candidates.candidate_id, { onDelete: 'cascade' })
      .notNull(),
    job_id: integer('job_id')
      .references(() => jobs.job_id, { onDelete: 'cascade' })
      .notNull(),
    applied_at: timestamp('applied_at').defaultNow(),
    current_stage: varchar('current_stage', { length: 50 }).default('Applied'),
    source: varchar('source', { length: 100 }),
  },
  (table) => ({
    idxCandidate: index('idx_applications_candidate').on(table.candidate_id),
    idxJob: index('idx_applications_job').on(table.job_id),
  })
);
