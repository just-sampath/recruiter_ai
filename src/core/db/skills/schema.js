import { integer, pgTable, varchar } from 'drizzle-orm/pg-core';

export const skills = pgTable('skills', {
  skill_id: integer('skill_id').generatedAlwaysAsIdentity().primaryKey(),
  skill_name: varchar('skill_name', { length: 100 }).notNull().unique(),
  category: varchar('category', { length: 100 }),
});
