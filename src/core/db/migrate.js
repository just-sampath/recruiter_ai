import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { connection, db } from './index.js';

async function bootstrapSchema() {
  const statements = [
    `CREATE TABLE IF NOT EXISTS recruiters (
      recruiter_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      full_name VARCHAR(255) NOT NULL,
      role VARCHAR(50) DEFAULT 'recruiter',
      created_at TIMESTAMP DEFAULT NOW()
    );`,
    `CREATE TABLE IF NOT EXISTS jobs (
      job_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      job_title VARCHAR(255) NOT NULL,
      department VARCHAR(100),
      location VARCHAR(100),
      description TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      status VARCHAR(50) DEFAULT 'Open'
    );`,
    `CREATE TABLE IF NOT EXISTS candidates (
      candidate_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      first_name VARCHAR(100) NOT NULL,
      last_name VARCHAR(100) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      phone VARCHAR(20),
      current_location VARCHAR(100),
      preferred_work_type VARCHAR(50),
      total_experience_years DECIMAL(4,1),
      current_company VARCHAR(255),
      current_title VARCHAR(255),
      notice_period_days INTEGER DEFAULT 0,
      can_join_immediately BOOLEAN DEFAULT FALSE,
      current_salary_lpa DECIMAL(10,2),
      expected_salary_lpa DECIMAL(10,2),
      created_at TIMESTAMP DEFAULT NOW()
    );`,
    `CREATE TABLE IF NOT EXISTS candidate_resumes (
      resume_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      candidate_id INTEGER REFERENCES candidates(candidate_id) ON DELETE CASCADE,
      resume_text TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );`,
    `CREATE TABLE IF NOT EXISTS skills (
      skill_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      skill_name VARCHAR(100) UNIQUE NOT NULL,
      category VARCHAR(100)
    );`,
    `CREATE TABLE IF NOT EXISTS candidate_skills (
      id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      candidate_id INTEGER REFERENCES candidates(candidate_id) ON DELETE CASCADE,
      skill_id INTEGER REFERENCES skills(skill_id) ON DELETE CASCADE,
      level VARCHAR(50),
      UNIQUE(candidate_id, skill_id)
    );`,
    `CREATE TABLE IF NOT EXISTS job_applications (
      application_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      candidate_id INTEGER REFERENCES candidates(candidate_id) ON DELETE CASCADE,
      job_id INTEGER REFERENCES jobs(job_id) ON DELETE CASCADE,
      applied_at TIMESTAMP DEFAULT NOW(),
      current_stage VARCHAR(50) DEFAULT 'Applied',
      source VARCHAR(100)
    );`,
    `CREATE TABLE IF NOT EXISTS screening_questions (
      question_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      question_text TEXT NOT NULL
    );`,
    `CREATE TABLE IF NOT EXISTS screening_answers (
      answer_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      application_id INTEGER REFERENCES job_applications(application_id) ON DELETE CASCADE,
      question_id INTEGER REFERENCES screening_questions(question_id) ON DELETE CASCADE,
      answer_text TEXT NOT NULL,
      answered_at TIMESTAMP DEFAULT NOW()
    );`,
    `CREATE TABLE IF NOT EXISTS one_way_interviews (
      one_way_interview_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      application_id INTEGER REFERENCES job_applications(application_id) ON DELETE CASCADE,
      recorded_at TIMESTAMP DEFAULT NOW()
    );`,
    `CREATE TABLE IF NOT EXISTS one_way_transcripts (
      transcript_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      one_way_interview_id INTEGER REFERENCES one_way_interviews(one_way_interview_id) ON DELETE CASCADE,
      question_text TEXT NOT NULL,
      answer_text TEXT NOT NULL
    );`,
    `CREATE TABLE IF NOT EXISTS recruiter_comments (
      comment_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      application_id INTEGER REFERENCES job_applications(application_id) ON DELETE CASCADE,
      author VARCHAR(255) NOT NULL,
      comment_text TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );`,
    `CREATE TABLE IF NOT EXISTS interviews (
      interview_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      application_id INTEGER REFERENCES job_applications(application_id) ON DELETE CASCADE,
      round_name VARCHAR(100) NOT NULL,
      interview_at TIMESTAMP NOT NULL
    );`,
    `CREATE TABLE IF NOT EXISTS interview_transcripts (
      transcript_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      interview_id INTEGER REFERENCES interviews(interview_id) ON DELETE CASCADE,
      transcript_text TEXT NOT NULL
    );`,
    `CREATE TABLE IF NOT EXISTS interview_scorecards (
      scorecard_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      interview_id INTEGER REFERENCES interviews(interview_id) ON DELETE CASCADE,
      overall_score DECIMAL(3,1),
      problem_solving DECIMAL(3,1),
      communication DECIMAL(3,1),
      ownership DECIMAL(3,1),
      culture_fit DECIMAL(3,1),
      notes TEXT
    );`,
    `CREATE TABLE IF NOT EXISTS indexing_queue (
      id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      event_type VARCHAR(50) NOT NULL,
      doc_type VARCHAR(50) NOT NULL,
      source_id INTEGER NOT NULL,
      candidate_id INTEGER NOT NULL,
      application_id INTEGER,
      job_id INTEGER,
      status VARCHAR(50) DEFAULT 'pending',
      retry_count INTEGER DEFAULT 0,
      error_message TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      processed_at TIMESTAMP
    );`,
    'CREATE INDEX IF NOT EXISTS idx_candidates_location ON candidates(current_location);',
    'CREATE INDEX IF NOT EXISTS idx_candidates_experience ON candidates(total_experience_years);',
    'CREATE INDEX IF NOT EXISTS idx_applications_candidate ON job_applications(candidate_id);',
    'CREATE INDEX IF NOT EXISTS idx_applications_job ON job_applications(job_id);',
    'CREATE INDEX IF NOT EXISTS idx_interviews_application ON interviews(application_id);',
    'CREATE INDEX IF NOT EXISTS idx_indexing_queue_status ON indexing_queue(status);',
  ];
  for (const stmt of statements) {
    await connection.unsafe(stmt);
  }
}

export async function ensureSchema({ closeConnection = true } = {}) {
  try {
    const journalExists = fs.existsSync('drizzle/meta/_journal.json');
    if (journalExists) {
      await migrate(db, { migrationsFolder: 'drizzle' });
    } else {
      await bootstrapSchema();
    }
  } finally {
    if (closeConnection) {
      await connection.end();
    }
  }
}

const isMain = process.argv[1]
  ? path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
  : false;

if (isMain) {
  ensureSchema({ closeConnection: true }).catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
