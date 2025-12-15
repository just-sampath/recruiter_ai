import DPI from 'js-dep-injector';
import { TYPES } from '../../core/types.js';
import { NotFoundError, ValidationError } from '../../utils/errors.js';
import { candidateUpdateSchema } from './validator.js';

/**
 * Retrieves candidate by ID.
 * @param {import('hono').Context} c - Context.
 * @returns {Promise<Response>} JSON candidate.
 */
export async function getCandidateById(c) {
  const id = Number(c.req.param('id'));
  const candidate = await DPI.get(TYPES.CandidateManager).getById(id);
  if (!candidate) {
    throw new NotFoundError('Candidate not found');
  }
  return c.json(candidate);
}

/**
 * Updates candidate profile and reindexes resume if provided.
 * @param {import('hono').Context} c - Context.
 * @returns {Promise<Response>} JSON candidate.
 */
export async function updateCandidate(c) {
  const id = Number(c.req.param('id'));
  const body = await c.req.json();
  const parsed = candidateUpdateSchema.safeParse(body);
  if (!parsed.success) {
    throw new ValidationError(parsed.error.message);
  }
  const updated = await DPI.get(TYPES.CandidateManager).update(id, parsed.data);
  if (!updated) {
    throw new NotFoundError('Candidate not found');
  }
  return c.json(updated);
}
