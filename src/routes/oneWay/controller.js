import DPI from 'js-dep-injector';
import { TYPES } from '../../core/types.js';
import { DOC_TYPES, INDEX_EVENT_TYPES } from '../../utils/constants.js';
import { NotFoundError, ValidationError } from '../../utils/errors.js';
import { oneWayTranscriptSchema } from './validator.js';

/**
 * Adds a one-way interview transcript and enqueues indexing.
 * @param {import('hono').Context} c - Context.
 * @returns {Promise<Response>} Transcript row.
 */
export async function addOneWayTranscript(c) {
  const oneWayId = Number(c.req.param('id'));
  const body = await c.req.json();
  const parsed = oneWayTranscriptSchema.safeParse(body);
  if (!parsed.success) {
    throw new ValidationError(parsed.error.message);
  }
  const manager = DPI.get(TYPES.OneWayInterviewManager);
  const application = await manager.getApplicationContext(oneWayId);
  if (!application) {
    throw new NotFoundError('One-way interview not found');
  }
  const transcript = await manager.addTranscript(
    oneWayId,
    parsed.data.question_text,
    parsed.data.answer_text
  );
  await DPI.get(TYPES.ProcessDocumentsQueue).enqueue({
    event_type: INDEX_EVENT_TYPES.UPSERT,
    doc_type: DOC_TYPES.ONE_WAY_TRANSCRIPT,
    source_id: transcript.transcript_id,
    candidate_id: application.candidate_id,
    application_id: application.application_id,
    job_id: application.job_id,
  });
  return c.json(transcript, 201);
}
