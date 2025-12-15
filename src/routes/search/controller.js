import DPI from 'js-dep-injector';
import { TYPES } from '../../core/types.js';
import { ValidationError } from '../../utils/errors.js';
import { searchSchema } from './validator.js';

/**
 * POST /api/search controller.
 * @param {import('hono').Context} c - Hono context.
 * @returns {Promise<Response>} JSON search response.
 */
export async function searchCandidates(c) {
  const body = await c.req.json();
  const parsed = searchSchema.safeParse(body);
  if (!parsed.success) {
    throw new ValidationError(parsed.error.message);
  }
  const { query, job_id, top_k } = parsed.data;
  const handler = DPI.get(TYPES.SearchHandler);
  const results = await handler.search(query, { jobId: job_id, topK: top_k });
  return c.json(results);
}
