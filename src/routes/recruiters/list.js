import DPI from 'js-dep-injector';
import { TYPES } from '../../core/types.js';
import { toPublicRecruiterList } from '../../utils/publicDto.js';

/**
 * Lists recruiters (superadmin only).
 * @param {import('hono').Context} c
 */
export async function listRecruiters(c) {
  const recruiters = await DPI.get(TYPES.RecruiterManager).list();
  return c.json(toPublicRecruiterList(recruiters));
}
