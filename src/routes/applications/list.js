import DPI from 'js-dep-injector';
import { TYPES } from '../../core/types.js';

/**
 * Lists all applications (recruiter/superadmin).
 * @param {import('hono').Context} c
 */
export async function listApplications(c) {
  const apps = await DPI.get(TYPES.ApplicationManager).list();
  return c.json(apps);
}
