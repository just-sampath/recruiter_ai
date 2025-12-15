/**
 * Simple request logger middleware.
 * @type {import('hono').MiddlewareHandler}
 */
export async function requestLogger(c, next) {
  const logger = c.get('logger');
  const start = Date.now();
  await next();
  const duration = Date.now() - start;
  if (logger) {
    logger.info(
      {
        method: c.req.method,
        path: c.req.path,
        status: c.res.status,
        duration,
      },
      'HTTP request'
    );
  }
}
