import DPI from 'js-dep-injector';
import { TYPES } from '../../core/types.js';
import { NotFoundError, ValidationError } from '../../utils/errors.js';
import { scorecardSchema, transcriptSchema } from './validator.js';

/**
 * Adds an interview transcript and enqueues indexing.
 * @param {import('hono').Context} c - Context.
 * @returns {Promise<Response>} Transcript row.
 */
export async function addTranscript(c) {
  const interviewId = Number(c.req.param('id'));
  const body = await c.req.json();
  const parsed = transcriptSchema.safeParse(body);
  if (!parsed.success) {
    throw new ValidationError(parsed.error.message);
  }
  const manager = DPI.get(TYPES.InterviewManager);
  const application = await manager.getApplicationForInterview(interviewId);
  if (!application) {
    throw new NotFoundError('Interview not found');
  }
  const transcript = await manager.addTranscript(interviewId, parsed.data.transcript_text);
  await DPI.get(TYPES.IndexingOrchestrator).enqueueInterviewTranscript({
    transcriptId: transcript.transcript_id,
    candidateId: application.candidate_id,
    applicationId: application.application_id,
    jobId: application.job_id,
  });
  return c.json(transcript, 201);
}

/**
 * Adds an interview scorecard.
 * @param {import('hono').Context} c - Context.
 * @returns {Promise<Response>} Scorecard row.
 */
export async function addScorecard(c) {
  const interviewId = Number(c.req.param('id'));
  const body = await c.req.json();
  const parsed = scorecardSchema.safeParse(body);
  if (!parsed.success) {
    throw new ValidationError(parsed.error.message);
  }
  const scorecard = await DPI.get(TYPES.InterviewManager).addScorecard(interviewId, parsed.data);
  if (!scorecard) {
    throw new NotFoundError('Interview not found');
  }
  return c.json(scorecard, 201);
}

/**
 * Retrieves interview by ID.
 * @param {import('hono').Context} c
 */
export async function getInterview(c) {
  const interviewId = Number(c.req.param('id'));
  const interview = await DPI.get(TYPES.InterviewManager).getById(interviewId);
  if (!interview) {
    throw new NotFoundError('Interview not found');
  }
  return c.json(interview);
}
