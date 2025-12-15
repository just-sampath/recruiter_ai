import DPI from 'js-dep-injector';
import { TYPES } from '../../core/types.js';
import { generateToken } from '../../utils/auth.js';
import { USER_ROLES } from '../../utils/constants.js';
import { AuthError, ValidationError } from '../../utils/errors.js';
import { candidateRegisterSchema, loginSchema } from './validator.js';

/**
 * Candidate registration handler.
 * @param {import('hono').Context} c - Hono context.
 * @returns {Promise<Response>} JSON response.
 */
export async function candidateRegister(c) {
  const body = await c.req.json();
  const parsed = candidateRegisterSchema.safeParse(body);
  if (!parsed.success) {
    throw new ValidationError(parsed.error.message);
  }
  const candidate = await DPI.get(TYPES.CandidateManager).create(parsed.data);
  const token = generateToken({
    sub: candidate.candidate_id,
    role: USER_ROLES.CANDIDATE,
    email: candidate.email,
  });
  return c.json({ candidate, token });
}

/**
 * Candidate login handler.
 * @param {import('hono').Context} c - Hono context.
 * @returns {Promise<Response>} JSON response.
 */
export async function candidateLogin(c) {
  const body = await c.req.json();
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    throw new ValidationError(parsed.error.message);
  }
  const manager = DPI.get(TYPES.CandidateManager);
  const candidate = await manager.validateLogin(parsed.data.email, parsed.data.password);
  if (!candidate) {
    throw new AuthError('Invalid credentials');
  }
  const token = generateToken({
    sub: candidate.candidate_id,
    role: USER_ROLES.CANDIDATE,
    email: candidate.email,
  });
  return c.json({ candidate, token });
}

/**
 * Recruiter login handler.
 * @param {import('hono').Context} c - Hono context.
 * @returns {Promise<Response>} JSON response.
 */
export async function recruiterLogin(c) {
  const body = await c.req.json();
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    throw new ValidationError(parsed.error.message);
  }
  const recruiter = await DPI.get(TYPES.RecruiterManager).validateLogin(
    parsed.data.email,
    parsed.data.password
  );
  if (!recruiter) {
    throw new AuthError('Invalid credentials');
  }
  const token = generateToken({
    sub: recruiter.recruiter_id,
    role: recruiter.role,
    email: recruiter.email,
  });
  return c.json({ recruiter, token });
}
