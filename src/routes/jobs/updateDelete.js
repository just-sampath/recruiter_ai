import DPI from 'js-dep-injector';
import { TYPES } from '../../core/types.js';
import { NotFoundError, ValidationError } from '../../utils/errors.js';
import { jobCreateSchema } from './validator.js';

/**
 * Updates a job by ID.
 * @param {import('hono').Context} c
 */
export async function updateJob(c) {
  const id = Number(c.req.param('id'));
  const body = await c.req.json();
  const parsed = jobCreateSchema.partial().safeParse(body);
  if (!parsed.success) {
    throw new ValidationError(parsed.error.message);
  }
  const updated = await DPI.get(TYPES.JobManager).update(id, parsed.data);
  if (!updated) {
    throw new NotFoundError('Job not found');
  }
  return c.json(updated);
}

/**
 * Deletes a job by ID.
 * @param {import('hono').Context} c
 */
export async function deleteJob(c) {
  const id = Number(c.req.param('id'));
  const job = await DPI.get(TYPES.JobManager).delete(id);
  if (!job) {
    throw new NotFoundError('Job not found');
  }
  return c.json({ deleted: true });
}
