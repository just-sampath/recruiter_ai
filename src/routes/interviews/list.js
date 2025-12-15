import DPI from 'js-dep-injector';
import { TYPES } from '../../core/types.js';

/**
 * Lists all interviews (recruiter/superadmin).
 * @param {import('hono').Context} c
 */
export async function listInterviews(c) {
  const interviews = await DPI.get(TYPES.InterviewManager).list();
  return c.json(interviews);
}
