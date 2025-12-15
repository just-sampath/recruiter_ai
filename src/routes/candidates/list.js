import DPI from 'js-dep-injector';
import { TYPES } from '../../core/types.js';

/**
 * Lists all candidates (recruiter/superadmin).
 * @param {import('hono').Context} c
 */
export async function listCandidates(c) {
  const candidates = await DPI.get(TYPES.CandidateManager).list();
  return c.json(candidates);
}
