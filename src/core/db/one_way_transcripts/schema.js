import { integer, pgTable, text } from 'drizzle-orm/pg-core';
import { oneWayInterviews } from '../one_way_interviews/schema.js';

export const oneWayTranscripts = pgTable('one_way_transcripts', {
  transcript_id: integer('transcript_id').generatedAlwaysAsIdentity().primaryKey(),
  one_way_interview_id: integer('one_way_interview_id')
    .references(() => oneWayInterviews.one_way_interview_id, { onDelete: 'cascade' })
    .notNull(),
  question_text: text('question_text').notNull(),
  answer_text: text('answer_text').notNull(),
});
