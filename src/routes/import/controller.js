import { and, eq, sql } from 'drizzle-orm';
import DPI from 'js-dep-injector';
import * as XLSX from 'xlsx';
import { jobApplications } from '../../core/db/applications/schema.js';
import { candidateResumes } from '../../core/db/candidate_resumes/schema.js';
import { candidateSkills } from '../../core/db/candidate_skills/schema.js';
import { candidates as candidateTable } from '../../core/db/candidates/schema.js';
import { interviews } from '../../core/db/interviews/schema.js';
import { jobs } from '../../core/db/jobs/schema.js';
import { oneWayInterviews } from '../../core/db/one_way_interviews/schema.js';
import { screeningAnswers } from '../../core/db/screening_answers/schema.js';
import { screeningQuestions } from '../../core/db/screening_questions/schema.js';
import { TYPES } from '../../core/types.js';
import { DOC_TYPES, INDEX_EVENT_TYPES } from '../../utils/constants.js';
import { ValidationError } from '../../utils/errors.js';
import { importFormSchema } from './validator.js';

const SHEETS = {
  JOBS: 'jobs',
  CANDIDATES: 'candidates',
  RESUMES: 'candidate_resumes',
  SKILLS: 'skills',
  CANDIDATE_SKILLS: 'candidate_skills',
  APPLICATIONS: 'job_applications',
  SCREENING_QUESTIONS: 'screening_questions',
  SCREENING_ANSWERS: 'screening_answers',
  ONE_WAY_INTERVIEWS: 'one_way_interviews',
  ONE_WAY_TRANSCRIPTS: 'one_way_transcripts',
  RECRUITER_COMMENTS: 'recruiter_comments',
  INTERVIEWS: 'interviews',
  INTERVIEW_TRANSCRIPTS: 'interview_transcripts',
  INTERVIEW_SCORECARDS: 'interview_scorecards',
};

const DEFAULT_PASSWORD = 'Temp@1234';

async function maybeTruncateTables(db, truncate, logger) {
  if (!truncate) return;
  try {
    await db.execute(
      sql`TRUNCATE TABLE screening_answers, screening_questions, interview_scorecards, interview_transcripts, interviews, one_way_transcripts, one_way_interviews, recruiter_comments, job_applications, candidate_skills, candidate_resumes, indexing_queue, candidates, jobs, skills RESTART IDENTITY CASCADE`
    );
    logger?.info('Import: truncated tables before import');
  } catch (err) {
    logger?.error({ err }, 'Import: failed to truncate tables');
    throw err;
  }
}

/**
 * Imports data from an XLSX file, creating records and enqueuing indexing jobs.
 * @param {import('hono').Context} c - Hono context.
 * @returns {Promise<Response>} Import summary.
 */
export async function importXlsx(c) {
  const logger = c.get('logger');
  try {
    const formData = await c.req.formData();
    const file = formData.get('file');
    const shouldTruncate = formData.get('shouldTruncate');
    const parsed = importFormSchema.safeParse({ file, shouldTruncate });
    if (!parsed.success || !file || typeof file.arrayBuffer !== 'function') {
      throw new ValidationError('Upload an XLSX file under field "file"');
    }
    const truncate = !!(
      parsed.data.shouldTruncate === true || parsed.data.shouldTruncate === 'true'
    );

    logger?.info(
      {
        filename: typeof file.name === 'string' ? file.name : 'unknown',
        size: typeof file.size === 'number' ? file.size : undefined,
        shouldTruncate: truncate,
      },
      'Import: received file'
    );

    const workbook = XLSX.read(await file.arrayBuffer(), { type: 'buffer' });
    const firstRows = Object.fromEntries(
      Object.entries(workbook.Sheets).map(([name, sheet]) => {
        const json = XLSX.utils.sheet_to_json(sheet, { range: 0, header: 1 });
        return [name, json?.[1] || json?.[0] || null];
      })
    );
    logger?.info({ sheets: workbook.SheetNames, firstRows }, 'Import: parsed workbook');
    const summary = {};
    const errors = [];

    const db = DPI.get(TYPES.Database);
    await maybeTruncateTables(db, truncate, logger);
    const jobManager = DPI.get(TYPES.JobManager);
    const candidateManager = DPI.get(TYPES.CandidateManager);
    const skillManager = DPI.get(TYPES.SkillManager);
    const applicationManager = DPI.get(TYPES.ApplicationManager);
    const recruiterCommentManager = DPI.get(TYPES.RecruiterCommentManager);
    const interviewManager = DPI.get(TYPES.InterviewManager);
    const oneWayManager = DPI.get(TYPES.OneWayInterviewManager);

    const candidatesByEmail = new Map();
    const candidateIdMap = new Map();
    const jobsByTitle = new Map();
    const jobIdMap = new Map();
    const skillsByName = new Map();
    const skillIdMap = new Map();
    const applicationsMap = new Map();
    const screeningQuestionMap = new Map();
    const oneWayMap = new Map();
    const interviewMap = new Map();

    const getSheet = (name) => {
      const sheetName =
        Object.keys(workbook.Sheets).find((n) => n.toLowerCase() === name.toLowerCase()) || name;
      return workbook.Sheets[sheetName] ? XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]) : [];
    };

    logger?.info('Import: processing jobs');
    const jobsSheet = getSheet(SHEETS.JOBS);
    summary.jobs = 0;
    for (const row of jobsSheet) {
      const sheetJobId = row.job_id;
      try {
        if (!row.job_title) {
          errors.push({ sheet: SHEETS.JOBS, row, error: 'job_title required' });
          continue;
        }
        let jobRow = null;
        if (sheetJobId !== undefined && sheetJobId !== null) {
          const byId = await db.select().from(jobs).where(eq(jobs.job_id, sheetJobId)).limit(1);
          jobRow = byId[0] || null;
        }
        if (!jobRow && !sheetJobId) {
          const byTitle = await db
            .select()
            .from(jobs)
            .where(eq(jobs.job_title, row.job_title))
            .limit(1);
          jobRow = byTitle[0] || null;
        }
        if (jobRow) {
          await db
            .update(jobs)
            .set({
              job_title: row.job_title,
              department: row.department,
              location: row.location,
              description: row.description,
              status: row.status || jobRow.status || 'Open',
            })
            .where(eq(jobs.job_id, jobRow.job_id));
        } else {
          jobRow = await jobManager.create({
            job_title: row.job_title,
            department: row.department,
            location: row.location,
            description: row.description,
            status: row.status || 'Open',
          });
          summary.jobs += 1;
        }
        jobsByTitle.set(jobRow.job_title, jobRow.job_id);
        jobIdMap.set(sheetJobId ?? jobRow.job_id, jobRow.job_id);
      } catch (err) {
        logger?.error({ err, row }, 'Import: job row failed');
        errors.push({ sheet: SHEETS.JOBS, row, error: err.message });
      }
    }

    logger?.info('Import: processing skills');
    const skillsSheet = getSheet(SHEETS.SKILLS);
    summary.skills = 0;
    for (const row of skillsSheet) {
      const skill = await skillManager.findOrCreate(row.skill_name, row.category);
      summary.skills += 1;
      skillsByName.set(skill.skill_name, skill.skill_id);
      if (row.skill_id !== undefined && row.skill_id !== null) {
        skillIdMap.set(row.skill_id, skill.skill_id);
      }
    }

    logger?.info('Import: processing candidates');
    const candidateSheet = getSheet(SHEETS.CANDIDATES);
    summary.candidates = 0;
    for (const row of candidateSheet) {
      const sheetCandidateId = row.candidate_id;
      try {
        if (!row.email || !row.first_name || !row.last_name) {
          errors.push({
            sheet: SHEETS.CANDIDATES,
            row,
            error: 'email/first_name/last_name required',
          });
          continue;
        }
        let candidate = await candidateManager.getByEmail(row.email);
        if (!candidate && sheetCandidateId) {
          const byId = await candidateManager.getById(sheetCandidateId);
          candidate = byId || null;
        }
        if (!candidate) {
          const password = row.password || DEFAULT_PASSWORD;
          candidate = await candidateManager.create({
            first_name: row.first_name,
            last_name: row.last_name,
            email: row.email,
            password,
            phone: row.phone,
            current_location: row.current_location,
            preferred_work_type: row.preferred_work_type,
            total_experience_years: row.total_experience_years,
            current_company: row.current_company,
            current_title: row.current_title,
            notice_period_days: row.notice_period_days,
            can_join_immediately: row.can_join_immediately,
            current_salary_lpa: row.current_salary_lpa,
            expected_salary_lpa: row.expected_salary_lpa,
          });
          summary.candidates += 1;
        }
        candidatesByEmail.set(candidate.email, candidate.candidate_id);
        candidateIdMap.set(sheetCandidateId ?? candidate.candidate_id, candidate.candidate_id);
      } catch (err) {
        logger?.error({ err, row }, 'Import: candidate row failed');
        errors.push({ sheet: SHEETS.CANDIDATES, row, error: err.message });
      }
    }

    logger?.info('Import: processing resumes');
    const resumeSheet = getSheet(SHEETS.RESUMES);
    summary.resumes = 0;
    const enqueuedResumes = new Set();
    for (const row of resumeSheet) {
      const candidateId =
        candidateIdMap.get(row.candidate_id) ||
        candidatesByEmail.get(row.email) ||
        row.candidate_id;
      try {
        if (!candidateId) {
          errors.push({ sheet: SHEETS.RESUMES, row, error: 'candidate_id or email required' });
          continue;
        }
        if (!row.resume_text) {
          errors.push({ sheet: SHEETS.RESUMES, row, error: 'resume_text required' });
          continue;
        }
        await db
          .insert(candidateResumes)
          .values({ candidate_id: candidateId, resume_text: row.resume_text });
        summary.resumes += 1;
        enqueuedResumes.add(candidateId);
      } catch (err) {
        logger?.error({ err, row }, 'Import: resume row failed');
        errors.push({ sheet: SHEETS.RESUMES, row, error: err.message });
      }
    }

    logger?.info('Import: processing candidate skills');
    const candidateSkillsSheet = getSheet(SHEETS.CANDIDATE_SKILLS);
    summary.candidate_skills = 0;
    for (const row of candidateSkillsSheet) {
      const candidateId =
        candidateIdMap.get(row.candidate_id) ||
        candidatesByEmail.get(row.email) ||
        row.candidate_id;
      if (!candidateId) {
        errors.push({ sheet: SHEETS.CANDIDATE_SKILLS, row, error: 'candidate_id/email missing' });
        continue;
      }
      const skillIdFromSheet = skillIdMap.get(row.skill_id) || row.skill_id;
      const skillName = row.skill_name;
      if (!skillIdFromSheet && !skillName) {
        errors.push({ sheet: SHEETS.CANDIDATE_SKILLS, row, error: 'skill_id/skill_name missing' });
        continue;
      }
      try {
        let skillId = skillIdFromSheet;
        if (!skillId) {
          const skill = skillsByName.get(skillName) || (await skillManager.findOrCreate(skillName));
          skillsByName.set(skill.skill_name, skill.skill_id);
          skillId = skill.skill_id;
        }
        const exists = await db
          .select()
          .from(candidateSkills)
          .where(
            and(
              eq(candidateSkills.candidate_id, candidateId),
              eq(candidateSkills.skill_id, skillId)
            )
          )
          .limit(1);
        if (!exists[0]) {
          await db.insert(candidateSkills).values({
            candidate_id: candidateId,
            skill_id: skillId,
            level: row.level,
          });
          summary.candidate_skills += 1;
        }
      } catch (err) {
        logger?.error({ err, row }, 'Import: candidate skill row failed');
        errors.push({ sheet: SHEETS.CANDIDATE_SKILLS, row, error: err.message });
      }
    }

    logger?.info('Import: processing applications');
    const applicationsSheet = getSheet(SHEETS.APPLICATIONS);
    summary.applications = 0;
    for (const row of applicationsSheet) {
      const candidateId =
        candidateIdMap.get(row.candidate_id) ||
        candidatesByEmail.get(row.email) ||
        row.candidate_id;
      const jobId = jobIdMap.get(row.job_id) || jobsByTitle.get(row.job_title) || row.job_id;
      try {
        if (!candidateId) {
          errors.push({ sheet: SHEETS.APPLICATIONS, row, error: 'candidate_id or email missing' });
          continue;
        }
        if (!jobId) {
          errors.push({ sheet: SHEETS.APPLICATIONS, row, error: 'job_id or job_title missing' });
          continue;
        }
        const jobRows = await db
          .select({ id: jobs.job_id })
          .from(jobs)
          .where(eq(jobs.job_id, jobId))
          .limit(1);
        if (!jobRows[0]) {
          errors.push({ sheet: SHEETS.APPLICATIONS, row, error: `job_id ${jobId} not found` });
          continue;
        }
        const existing = await db
          .select()
          .from(jobApplications)
          .where(
            and(eq(jobApplications.candidate_id, candidateId), eq(jobApplications.job_id, jobId))
          )
          .limit(1);
        const application =
          existing[0] ||
          (await applicationManager.create({
            candidate_id: candidateId,
            job_id: jobId,
            current_stage: row.current_stage || 'Applied',
            source: row.source,
          }));
        if (!existing[0]) {
          summary.applications += 1;
        }
        const sheetAppId = row.application_id || application.application_id;
        applicationsMap.set(sheetAppId, application.application_id);
        const resume = await candidateManager.getLatestResume(candidateId);
        if (resume && !enqueuedResumes.has(candidateId)) {
          await DPI.get(TYPES.ProcessDocumentsQueue).enqueue({
            event_type: INDEX_EVENT_TYPES.UPSERT,
            doc_type: DOC_TYPES.RESUME,
            source_id: resume.resume_id,
            candidate_id: candidateId,
            application_id: application.application_id,
            job_id: jobId,
          });
          enqueuedResumes.add(candidateId);
        }
      } catch (err) {
        logger?.error({ err, row }, 'Import: application row failed');
        errors.push({ sheet: SHEETS.APPLICATIONS, row, error: err.message });
      }
    }

    logger?.info('Import: processing screening questions');
    const screeningQSheet = getSheet(SHEETS.SCREENING_QUESTIONS);
    summary.screening_questions = 0;
    for (const row of screeningQSheet) {
      try {
        const [created] = await db
          .insert(screeningQuestions)
          .values({ question_text: row.question_text })
          .returning();
        summary.screening_questions += 1;
        const sheetQId = row.question_id || created.question_id;
        screeningQuestionMap.set(sheetQId, created.question_id);
      } catch (err) {
        logger?.error({ err, row }, 'Import: screening question row failed');
        errors.push({ sheet: SHEETS.SCREENING_QUESTIONS, row, error: err.message });
      }
    }

    logger?.info('Import: processing screening answers');
    const screeningASheet = getSheet(SHEETS.SCREENING_ANSWERS);
    summary.screening_answers = 0;
    for (const row of screeningASheet) {
      try {
        const appId = applicationsMap.get(row.application_id) || row.application_id;
        const questionId = screeningQuestionMap.get(row.question_id) || row.question_id;
        if (!appId || !questionId) {
          errors.push({
            sheet: SHEETS.SCREENING_ANSWERS,
            row,
            error: 'application_id/question_id missing or unmapped',
          });
          continue;
        }
        await db.insert(screeningAnswers).values({
          application_id: appId,
          question_id: questionId,
          answer_text: row.answer_text,
        });
        summary.screening_answers += 1;
      } catch (err) {
        logger?.error({ err, row }, 'Import: screening answer row failed');
        errors.push({ sheet: SHEETS.SCREENING_ANSWERS, row, error: err.message });
      }
    }

    logger?.info('Import: processing one-way interviews');
    const oneWaySheet = getSheet(SHEETS.ONE_WAY_INTERVIEWS);
    summary.one_way_interviews = 0;
    for (const row of oneWaySheet) {
      const mappedApplicationId = applicationsMap.get(row.application_id) || row.application_id;
      try {
        if (!mappedApplicationId) {
          errors.push({ sheet: SHEETS.ONE_WAY_INTERVIEWS, row, error: 'application_id required' });
          continue;
        }
        const app = await applicationManager.getById(mappedApplicationId);
        if (!app) {
          errors.push({
            sheet: SHEETS.ONE_WAY_INTERVIEWS,
            row,
            error: `application_id ${mappedApplicationId} not found`,
          });
          continue;
        }
        const [created] = await db
          .insert(oneWayInterviews)
          .values({
            application_id: mappedApplicationId,
            recorded_at: row.recorded_at ? new Date(row.recorded_at) : undefined,
          })
          .returning();
        if (created) {
          summary.one_way_interviews += 1;
          const key = row.one_way_interview_id || created.one_way_interview_id;
          oneWayMap.set(key, created.one_way_interview_id);
        }
      } catch (err) {
        logger?.error({ err, row }, 'Import: one-way interview row failed');
        errors.push({ sheet: SHEETS.ONE_WAY_INTERVIEWS, row, error: err.message });
      }
    }

    logger?.info('Import: processing one-way transcripts');
    const oneWayTranscriptSheet = getSheet(SHEETS.ONE_WAY_TRANSCRIPTS);
    summary.one_way_transcripts = 0;
    for (const row of oneWayTranscriptSheet) {
      const oneWayId = oneWayMap.get(row.one_way_interview_id) || row.one_way_interview_id;
      try {
        if (!oneWayId) {
          errors.push({
            sheet: SHEETS.ONE_WAY_TRANSCRIPTS,
            row,
            error: 'one_way_interview_id missing',
          });
          continue;
        }
        const application = await oneWayManager.getApplicationContext(oneWayId);
        if (!application) {
          errors.push({
            sheet: SHEETS.ONE_WAY_TRANSCRIPTS,
            row,
            error: 'application missing for one_way_interview',
          });
          continue;
        }
        const transcript = await oneWayManager.addTranscript(
          oneWayId,
          row.question_text,
          row.answer_text
        );
        summary.one_way_transcripts += 1;
        await DPI.get(TYPES.ProcessDocumentsQueue).enqueue({
          event_type: INDEX_EVENT_TYPES.UPSERT,
          doc_type: DOC_TYPES.ONE_WAY_TRANSCRIPT,
          source_id: transcript.transcript_id,
          candidate_id: application.candidate_id,
          application_id: application.application_id,
          job_id: application.job_id,
        });
      } catch (err) {
        logger?.error({ err, row }, 'Import: one-way transcript row failed');
        errors.push({ sheet: SHEETS.ONE_WAY_TRANSCRIPTS, row, error: err.message });
      }
    }

    logger?.info('Import: processing recruiter comments');
    const commentsSheet = getSheet(SHEETS.RECRUITER_COMMENTS);
    summary.recruiter_comments = 0;
    for (const row of commentsSheet) {
      try {
        const mappedAppId = applicationsMap.get(row.application_id) || row.application_id;
        const application = mappedAppId ? await applicationManager.getById(mappedAppId) : null;
        if (!application) {
          errors.push({ sheet: SHEETS.RECRUITER_COMMENTS, row, error: 'application not found' });
          continue;
        }
        const comment = await recruiterCommentManager.create({
          application_id: application.application_id,
          author: row.author || 'import',
          comment_text: row.comment_text,
        });
        summary.recruiter_comments += 1;
        await DPI.get(TYPES.ProcessDocumentsQueue).enqueue({
          event_type: INDEX_EVENT_TYPES.UPSERT,
          doc_type: DOC_TYPES.RECRUITER_COMMENT,
          source_id: comment.comment_id,
          candidate_id: application.candidate_id,
          application_id: application.application_id,
          job_id: application.job_id,
        });
      } catch (err) {
        logger?.error({ err, row }, 'Import: recruiter comment row failed');
        errors.push({ sheet: SHEETS.RECRUITER_COMMENTS, row, error: err.message });
      }
    }

    logger?.info('Import: processing interviews');
    const interviewsSheet = getSheet(SHEETS.INTERVIEWS);
    summary.interviews = 0;
    for (const row of interviewsSheet) {
      try {
        const mappedAppId = applicationsMap.get(row.application_id) || row.application_id;
        if (!mappedAppId) {
          errors.push({ sheet: SHEETS.INTERVIEWS, row, error: 'application_id required' });
          continue;
        }
        const application = await applicationManager.getById(mappedAppId);
        if (!application) {
          errors.push({
            sheet: SHEETS.INTERVIEWS,
            row,
            error: `application_id ${mappedAppId} not found`,
          });
          continue;
        }
        const [created] = await db
          .insert(interviews)
          .values({
            application_id: mappedAppId,
            round_name: row.round_name,
            interview_at: row.interview_at ? new Date(row.interview_at) : undefined,
          })
          .returning();
        if (created) {
          summary.interviews += 1;
          const key = row.interview_id || created.interview_id;
          interviewMap.set(key, created.interview_id);
        }
      } catch (err) {
        logger?.error({ err, row }, 'Import: interview row failed');
        errors.push({ sheet: SHEETS.INTERVIEWS, row, error: err.message });
      }
    }

    logger?.info('Import: processing interview transcripts');
    const interviewTranscriptSheet = getSheet(SHEETS.INTERVIEW_TRANSCRIPTS);
    summary.interview_transcripts = 0;
    for (const row of interviewTranscriptSheet) {
      const interviewId = interviewMap.get(row.interview_id) || row.interview_id;
      try {
        if (!interviewId) {
          errors.push({ sheet: SHEETS.INTERVIEW_TRANSCRIPTS, row, error: 'interview_id missing' });
          continue;
        }
        const application = await interviewManager.getApplicationForInterview(interviewId);
        if (!application) {
          errors.push({
            sheet: SHEETS.INTERVIEW_TRANSCRIPTS,
            row,
            error: 'application missing for interview',
          });
          continue;
        }
        const transcript = await interviewManager.addTranscript(interviewId, row.transcript_text);
        summary.interview_transcripts += 1;
        await DPI.get(TYPES.ProcessDocumentsQueue).enqueue({
          event_type: INDEX_EVENT_TYPES.UPSERT,
          doc_type: DOC_TYPES.INTERVIEW_TRANSCRIPT,
          source_id: transcript.transcript_id,
          candidate_id: application.candidate_id,
          application_id: application.application_id,
          job_id: application.job_id,
        });
      } catch (err) {
        logger?.error({ err, row }, 'Import: interview transcript row failed');
        errors.push({ sheet: SHEETS.INTERVIEW_TRANSCRIPTS, row, error: err.message });
      }
    }

    logger?.info('Import: processing interview scorecards');
    const interviewScorecardSheet = getSheet(SHEETS.INTERVIEW_SCORECARDS);
    summary.interview_scorecards = 0;
    for (const row of interviewScorecardSheet) {
      const interviewId = interviewMap.get(row.interview_id) || row.interview_id;
      try {
        if (!interviewId) {
          errors.push({ sheet: SHEETS.INTERVIEW_SCORECARDS, row, error: 'interview_id missing' });
          continue;
        }
        await interviewManager.addScorecard(interviewId, {
          overall_score: row.overall_score,
          problem_solving: row.problem_solving,
          communication: row.communication,
          ownership: row.ownership,
          culture_fit: row.culture_fit,
          notes: row.notes,
        });
        summary.interview_scorecards += 1;
      } catch (err) {
        logger?.error({ err, row }, 'Import: interview scorecard row failed');
        errors.push({ sheet: SHEETS.INTERVIEW_SCORECARDS, row, error: err.message });
      }
    }

    logger?.info({ summary, errors }, 'Import completed');
    return c.json({ imported: summary, indexing: 'in_progress', errors });
  } catch (err) {
    const logger = c.get('logger');
    logger?.error({ err }, 'Import XLSX failed');
    throw err;
  }
}
