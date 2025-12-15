import { integer, numeric, pgTable, text } from 'drizzle-orm/pg-core';
import { interviews } from '../interviews/schema.js';

export const interviewScorecards = pgTable('interview_scorecards', {
  scorecard_id: integer('scorecard_id').generatedAlwaysAsIdentity().primaryKey(),
  interview_id: integer('interview_id')
    .references(() => interviews.interview_id, { onDelete: 'cascade' })
    .notNull(),
  overall_score: numeric('overall_score', { precision: 3, scale: 1 }),
  problem_solving: numeric('problem_solving', { precision: 3, scale: 1 }),
  communication: numeric('communication', { precision: 3, scale: 1 }),
  ownership: numeric('ownership', { precision: 3, scale: 1 }),
  culture_fit: numeric('culture_fit', { precision: 3, scale: 1 }),
  notes: text('notes'),
});
