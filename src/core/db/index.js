import config from 'config';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import { jobApplications } from './applications/schema.js';
import { candidateResumes } from './candidate_resumes/schema.js';
import { candidateSkills } from './candidate_skills/schema.js';
import { candidates } from './candidates/schema.js';
import { indexingQueue } from './indexing_queue/schema.js';
import { interviewScorecards } from './interview_scorecards/schema.js';
import { interviewTranscripts } from './interview_transcripts/schema.js';
import { interviews } from './interviews/schema.js';
import { jobs } from './jobs/schema.js';
import { oneWayInterviews } from './one_way_interviews/schema.js';
import { oneWayTranscripts } from './one_way_transcripts/schema.js';
import { recruiterComments } from './recruiter_comments/schema.js';
import { recruiters } from './recruiters/schema.js';
import { screeningAnswers } from './screening_answers/schema.js';
import { screeningQuestions } from './screening_questions/schema.js';
import { skills } from './skills/schema.js';

const databaseUrl = process.env.DATABASE_URL || config.get('database.url');
export const connection = postgres(databaseUrl, { max: 10 });

export const schema = {
  candidates,
  candidateResumes,
  candidateSkills,
  jobs,
  jobApplications,
  screeningQuestions,
  screeningAnswers,
  oneWayInterviews,
  oneWayTranscripts,
  recruiterComments,
  interviews,
  interviewTranscripts,
  interviewScorecards,
  recruiters,
  skills,
  indexingQueue,
};

export const db = drizzle(connection, { schema });
