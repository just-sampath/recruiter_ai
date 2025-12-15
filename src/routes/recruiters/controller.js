import DPI from 'js-dep-injector';
import { TYPES } from '../../core/types.js';
import { ValidationError } from '../../utils/errors.js';
import { recruiterCreateSchema } from './validator.js';

/**
 * Creates a recruiter (superadmin).
 * @param {import('hono').Context} c - Context.
 * @returns {Promise<Response>} Recruiter row.
 */
export async function createRecruiter(c) {
  const body = await c.req.json();
  const parsed = recruiterCreateSchema.safeParse(body);
  if (!parsed.success) {
    throw new ValidationError(parsed.error.message);
  }
  const recruiter = await DPI.get(TYPES.RecruiterManager).create(parsed.data);
  return c.json(recruiter, 201);
}

/**
 * Retrieves a recruiter by ID.
 * @param {import('hono').Context} c
 */
export async function getRecruiter(c) {
  const id = Number(c.req.param('id'));
  const recruiter = await DPI.get(TYPES.RecruiterManager).getById(id);
  if (!recruiter) {
    throw new ValidationError('Recruiter not found');
  }
  return c.json(recruiter);
}

/**
 * Updates a recruiter.
 * @param {import('hono').Context} c
 */
export async function updateRecruiter(c) {
  const id = Number(c.req.param('id'));
  const body = await c.req.json();
  const parsed = recruiterCreateSchema.partial().safeParse(body);
  if (!parsed.success) {
    throw new ValidationError(parsed.error.message);
  }
  const recruiter = await DPI.get(TYPES.RecruiterManager).update(id, parsed.data);
  if (!recruiter) {
    throw new ValidationError('Recruiter not found');
  }
  return c.json(recruiter);
}

/**
 * Deletes a recruiter.
 * @param {import('hono').Context} c
 */
export async function deleteRecruiter(c) {
  const id = Number(c.req.param('id'));
  const deleted = await DPI.get(TYPES.RecruiterManager).delete(id);
  if (!deleted) {
    throw new ValidationError('Recruiter not found');
  }
  return c.json({ deleted: true });
}
