import DPI from 'js-dep-injector';
import { TYPES } from '../../core/types.js';
import { DOC_TYPES, INDEX_EVENT_TYPES } from '../../utils/constants.js';
import { NotFoundError, ValidationError } from '../../utils/errors.js';
import { recruiterCommentSchema } from './validator.js';

/**
 * Candidate applies to a job.
 * @param {import('hono').Context} c - Context.
 * @returns {Promise<Response>} Application record.
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
  const payload = {
    job_id: jobId,
    candidate_id: user.sub,
    source: 'portal',
  };
  const application = await DPI.get(TYPES.ApplicationManager).create(payload);

  const resume = await DPI.get(TYPES.CandidateManager).getLatestResume(user.sub);
  if (resume) {
    await DPI.get(TYPES.ProcessDocumentsQueue).enqueue({
      event_type: INDEX_EVENT_TYPES.UPSERT,
      doc_type: DOC_TYPES.RESUME,
      source_id: resume.resume_id,
      candidate_id: user.sub,
      application_id: application.application_id,
      job_id: jobId,
    });
  }

  return c.json(application, 201);
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
  await DPI.get(TYPES.ProcessDocumentsQueue).enqueue({
    event_type: INDEX_EVENT_TYPES.UPSERT,
    doc_type: DOC_TYPES.RECRUITER_COMMENT,
    source_id: comment.comment_id,
    candidate_id: application.candidate_id,
    application_id: application.application_id,
    job_id: application.job_id,
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
