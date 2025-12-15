import DPI from 'js-dep-injector';
import { TYPES } from '../../core/types.js';
import { ForbiddenError, NotFoundError, ValidationError } from '../../utils/errors.js';
import { candidateUpdateSchema } from './validator.js';

/**
 * GET /api/me - returns the authenticated candidate profile.
 * @param {import('hono').Context} c
 */
export async function getMe(c) {
  const user = c.get('user');
  if (!user || user.role !== 'candidate') {
    throw new ForbiddenError('Only candidates can access /api/me');
  }
  const candidate = await DPI.get(TYPES.CandidateManager).getById(user.sub);
  if (!candidate) {
    throw new NotFoundError('Candidate not found');
  }
  return c.json(candidate);
}

/**
 * PUT /api/me - updates authenticated candidate profile.
 * @param {import('hono').Context} c
 */
export async function updateMe(c) {
  const user = c.get('user');
  if (!user || user.role !== 'candidate') {
    throw new ForbiddenError('Only candidates can update their profile');
  }
  const body = await c.req.json();
  const parsed = candidateUpdateSchema.safeParse(body);
  if (!parsed.success) {
    throw new ValidationError(parsed.error.message);
  }
  const updated = await DPI.get(TYPES.CandidateManager).update(user.sub, parsed.data);
  if (!updated) {
    throw new NotFoundError('Candidate not found');
  }
  return c.json(updated);
}
