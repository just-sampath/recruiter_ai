import { timingSafeEqual } from 'node:crypto';
import config from 'config';
import { verifyToken } from '../utils/auth.js';
import { USER_ROLES } from '../utils/constants.js';
import { AppError, AuthError, ForbiddenError } from '../utils/errors.js';

/**
 * Authentication middleware for Hono routes.
 * @param {Array<string>} [allowedRoles] - Optional allowed roles.
 * @returns {import('hono').MiddlewareHandler}
 */
export function requireAuth(allowedRoles = []) {
  return async (c, next) => {
    const authHeader = c.req.header('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AuthError('Missing authorization header');
    }
    const token = authHeader.replace('Bearer ', '');
    let payload;
    try {
      payload = verifyToken(token);
    } catch (err) {
      throw new AuthError('Invalid token');
    }
    if (allowedRoles.length > 0 && !allowedRoles.includes(payload.role)) {
      throw new ForbiddenError('Insufficient role');
    }
    c.set('user', payload);
    await next();
  };
}

/**
 * Require a shared internal init token (Bearer or X-Internal-Token).
 * Empty configured token disables the endpoint with 503.
 * @type {import('hono').MiddlewareHandler}
 */
export async function requireInternalToken(c, next) {
  const expected = process.env.INTERNAL_INIT_TOKEN || config.get('internal.initToken') || '';
  if (!expected) {
    throw new AppError('Internal init is disabled', 503, 'INTERNAL_DISABLED');
  }
  const auth = c.req.header('Authorization') || '';
  const bearer = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  const headerToken = c.req.header('X-Internal-Token') || '';
  const provided = bearer || headerToken;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    throw new AuthError('Invalid internal token');
  }
  await next();
}

/**
 * Helpers for common role gates.
 */
export const recruiterOnly = requireAuth([USER_ROLES.RECRUITER, USER_ROLES.SUPERADMIN]);
export const superadminOnly = requireAuth([USER_ROLES.SUPERADMIN]);
export const candidateOnly = requireAuth([USER_ROLES.CANDIDATE]);
