import { integer, pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { jobApplications } from '../applications/schema.js';
import { screeningQuestions } from '../screening_questions/schema.js';

export const screeningAnswers = pgTable('screening_answers', {
  answer_id: integer('answer_id').generatedAlwaysAsIdentity().primaryKey(),
  application_id: integer('application_id')
    .references(() => jobApplications.application_id, { onDelete: 'cascade' })
    .notNull(),
  question_id: integer('question_id')
    .references(() => screeningQuestions.question_id, { onDelete: 'cascade' })
    .notNull(),
  answer_text: text('answer_text').notNull(),
  answered_at: timestamp('answered_at').defaultNow(),
});
