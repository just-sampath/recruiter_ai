import { integer, pgTable, text } from 'drizzle-orm/pg-core';
import { interviews } from '../interviews/schema.js';

export const interviewTranscripts = pgTable('interview_transcripts', {
  transcript_id: integer('transcript_id').generatedAlwaysAsIdentity().primaryKey(),
  interview_id: integer('interview_id')
    .references(() => interviews.interview_id, { onDelete: 'cascade' })
    .notNull(),
  transcript_text: text('transcript_text').notNull(),
});
