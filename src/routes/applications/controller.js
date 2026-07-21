import DPI from 'js-dep-injector';
import { TYPES } from '../../core/types.js';
import { NotFoundError, ValidationError } from '../../utils/errors.js';
import { recruiterCommentSchema } from './validator.js';

/**
 * Postgres unique_violation (and drizzle-wrapped forms).
 * @param {unknown} err
 * @returns {boolean}
 */
function isUniqueViolation(err) {
  if (!err || typeof err !== 'object') {
    return false;
  }
  const code = /** @type {{ code?: string, cause?: { code?: string } }} */ (err).code;
  const causeCode = /** @type {{ cause?: { code?: string } }} */ (err).cause?.code;
  return code === '23505' || causeCode === '23505';
}

/**
 * Candidate applies to a job (idempotent on candidate+job pair).
 * @param {import('hono').Context} c - Context.
 * @returns {Promise<Response>} Application record (201 created, 200 existing).
 */
export async function applyToJob(c) {
  const jobId = Number(c.req.param('id'));
  if (!jobId) {
    throw new ValidationError('Invalid job id');
  }
  const user = c.get('user');
  if (!user || user.role !== 'candidate') {
    throw new ValidationError('Only candidates can apply');
  }
  const candidateId = user.sub;

  const job = await DPI.get(TYPES.JobManager).getById(jobId);
  if (!job) {
    throw new NotFoundError('Job not found');
  }

  const applicationManager = DPI.get(TYPES.ApplicationManager);
  const existing = await applicationManager.getByCandidateAndJob(candidateId, jobId);
  if (existing) {
    // Idempotent re-apply: return existing, do not re-enqueue.
    return c.json(existing, 200);
  }

  try {
    const application = await applicationManager.create({
      job_id: jobId,
      candidate_id: candidateId,
      source: 'portal',
    });

    await DPI.get(TYPES.IndexingOrchestrator).enqueueLatestResumeForCandidate(candidateId, {
      applicationId: application.application_id,
      jobId,
    });

    return c.json(application, 201);
  } catch (err) {
    // Race: concurrent insert hit unique (candidate_id, job_id) → re-fetch → 200.
    if (isUniqueViolation(err)) {
      const raced = await applicationManager.getByCandidateAndJob(candidateId, jobId);
      if (raced) {
        return c.json(raced, 200);
      }
    }
    throw err;
  }
}

/**
 * Adds a recruiter comment to an application and enqueues indexing.
 * @param {import('hono').Context} c - Context.
 * @returns {Promise<Response>} Comment row.
 */
export async function addRecruiterComment(c) {
  const applicationId = Number(c.req.param('id'));
  const body = await c.req.json();
  const parsed = recruiterCommentSchema.safeParse(body);
  if (!parsed.success) {
    throw new ValidationError(parsed.error.message);
  }
  const application = await DPI.get(TYPES.ApplicationManager).getById(applicationId);
  if (!application) {
    throw new NotFoundError('Application not found');
  }
  const author = c.get('user')?.email || 'unknown';
  const comment = await DPI.get(TYPES.RecruiterCommentManager).create({
    application_id: applicationId,
    author,
    comment_text: parsed.data.comment_text,
  });
  await DPI.get(TYPES.IndexingOrchestrator).enqueueRecruiterComment({
    commentId: comment.comment_id,
    candidateId: application.candidate_id,
    applicationId: application.application_id,
    jobId: application.job_id,
  });
  return c.json(comment, 201);
}

/**
 * Gets an application by ID (recruiter/superadmin).
 * @param {import('hono').Context} c
 */
export async function getApplicationById(c) {
  const id = Number(c.req.param('id'));
  const application = await DPI.get(TYPES.ApplicationManager).getById(id);
  if (!application) {
    throw new NotFoundError('Application not found');
  }
  return c.json(application);
}
