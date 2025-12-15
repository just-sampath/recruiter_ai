import { integer, pgTable, text } from 'drizzle-orm/pg-core';

export const screeningQuestions = pgTable('screening_questions', {
  question_id: integer('question_id').generatedAlwaysAsIdentity().primaryKey(),
  question_text: text('question_text').notNull(),
});
