import DPI from 'js-dep-injector';
import { TYPES } from '../../core/types.js';
import { NotFoundError, ValidationError } from '../../utils/errors.js';
import { jobCreateSchema } from './validator.js';

/**
 * Creates a job posting.
 * @param {import('hono').Context} c - Context.
 * @returns {Promise<Response>} JSON job.
 */
export async function createJob(c) {
  const body = await c.req.json();
  const parsed = jobCreateSchema.safeParse(body);
  if (!parsed.success) {
    throw new ValidationError(parsed.error.message);
  }
  const job = await DPI.get(TYPES.JobManager).create(parsed.data);
  return c.json(job, 201);
}

/**
 * Lists all jobs.
 * @param {import('hono').Context} c - Context.
 * @returns {Promise<Response>} JSON jobs.
 */
export async function listJobs(c) {
  const jobsList = await DPI.get(TYPES.JobManager).list();
  return c.json(jobsList);
}

/**
 * Retrieves job by ID.
 * @param {import('hono').Context} c - Context.
 * @returns {Promise<Response>} JSON job.
 */
export async function getJob(c) {
  const id = Number(c.req.param('id'));
  const job = await DPI.get(TYPES.JobManager).getById(id);
  if (!job) {
    throw new NotFoundError('Job not found');
  }
  return c.json(job);
}
