import { integer, pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { candidates } from '../candidates/schema.js';

export const candidateResumes = pgTable('candidate_resumes', {
  resume_id: integer('resume_id').generatedAlwaysAsIdentity().primaryKey(),
  candidate_id: integer('candidate_id')
    .references(() => candidates.candidate_id, { onDelete: 'cascade' })
    .notNull(),
  resume_text: text('resume_text').notNull(),
  created_at: timestamp('created_at').defaultNow(),
});
