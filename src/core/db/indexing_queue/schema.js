import { integer, pgTable, text, timestamp, varchar } from 'drizzle-orm/pg-core';
import { index } from 'drizzle-orm/pg-core';

export const indexingQueue = pgTable(
  'indexing_queue',
  {
    id: integer('id').generatedAlwaysAsIdentity().primaryKey(),
    event_type: varchar('event_type', { length: 50 }).notNull(),
    doc_type: varchar('doc_type', { length: 50 }).notNull(),
    source_id: integer('source_id').notNull(),
    candidate_id: integer('candidate_id').notNull(),
    application_id: integer('application_id'),
    job_id: integer('job_id'),
    status: varchar('status', { length: 50 }).default('pending'),
    retry_count: integer('retry_count').default(0),
    error_message: text('error_message'),
    created_at: timestamp('created_at').defaultNow(),
    processed_at: timestamp('processed_at'),
  },
  (table) => ({
    idxStatus: index('idx_indexing_queue_status').on(table.status),
  })
);
