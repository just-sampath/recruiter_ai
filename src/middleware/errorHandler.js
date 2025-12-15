import { AppError } from '../utils/errors.js';

/**
 * Global error handler for Hono.
 * @param {Error} err - Thrown error.
 * @param {import('hono').Context} c - Hono context.
 * @returns {Response} JSON response with error details.
 */
export function errorHandler(err, c) {
  const status = err instanceof AppError ? err.statusCode : 500;
  const code = err instanceof AppError ? err.code : 'INTERNAL_ERROR';
  const message = err.message || 'Unexpected error';

  const logger = c.get('logger');
  if (logger) {
    logger.error({ err, path: c.req.path }, 'Request failed');
  }

  return c.json(
    {
      error: {
        code,
        message,
      },
    },
    status
  );
}
