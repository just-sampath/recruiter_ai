import { integer, pgTable, uniqueIndex, varchar } from 'drizzle-orm/pg-core';
import { candidates } from '../candidates/schema.js';
import { skills } from '../skills/schema.js';

export const candidateSkills = pgTable(
  'candidate_skills',
  {
    id: integer('id').generatedAlwaysAsIdentity().primaryKey(),
    candidate_id: integer('candidate_id')
      .references(() => candidates.candidate_id, { onDelete: 'cascade' })
      .notNull(),
    skill_id: integer('skill_id')
      .references(() => skills.skill_id, { onDelete: 'cascade' })
      .notNull(),
    level: varchar('level', { length: 50 }),
  },
  (table) => ({
    uniqCandidateSkill: uniqueIndex('uniq_candidate_skill').on(table.candidate_id, table.skill_id),
  })
);
