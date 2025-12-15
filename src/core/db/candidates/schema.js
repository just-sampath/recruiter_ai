import { boolean, integer, numeric, pgTable, timestamp, varchar } from 'drizzle-orm/pg-core';
import { index } from 'drizzle-orm/pg-core';

export const candidates = pgTable(
  'candidates',
  {
    candidate_id: integer('candidate_id').generatedAlwaysAsIdentity().primaryKey(),
    first_name: varchar('first_name', { length: 100 }).notNull(),
    last_name: varchar('last_name', { length: 100 }).notNull(),
    email: varchar('email', { length: 255 }).notNull().unique(),
    password_hash: varchar('password_hash', { length: 255 }).notNull(),
    phone: varchar('phone', { length: 20 }),
    current_location: varchar('current_location', { length: 100 }),
    preferred_work_type: varchar('preferred_work_type', { length: 50 }),
    total_experience_years: numeric('total_experience_years', { precision: 4, scale: 1 }),
    current_company: varchar('current_company', { length: 255 }),
    current_title: varchar('current_title', { length: 255 }),
    notice_period_days: integer('notice_period_days').default(0),
    can_join_immediately: boolean('can_join_immediately').default(false),
    current_salary_lpa: numeric('current_salary_lpa', { precision: 10, scale: 2 }),
    expected_salary_lpa: numeric('expected_salary_lpa', { precision: 10, scale: 2 }),
    created_at: timestamp('created_at').defaultNow(),
  },
  (table) => ({
    idxLocation: index('idx_candidates_location').on(table.current_location),
    idxExperience: index('idx_candidates_experience').on(table.total_experience_years),
  })
);
