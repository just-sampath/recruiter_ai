import { config } from 'dotenv';

config();

/** @type {import('drizzle-kit').Config} */
export default {
  schema: './src/core/db/**/*/schema.js',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/recruiter_ai',
  },
};
