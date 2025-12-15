import { verifyToken } from '../utils/auth.js';
import { USER_ROLES } from '../utils/constants.js';
import { AuthError, ForbiddenError } from '../utils/errors.js';

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
 * Helpers for common role gates.
 */
export const recruiterOnly = requireAuth([USER_ROLES.RECRUITER, USER_ROLES.SUPERADMIN]);
export const superadminOnly = requireAuth([USER_ROLES.SUPERADMIN]);
export const candidateOnly = requireAuth([USER_ROLES.CANDIDATE]);
