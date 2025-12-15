import pino from 'pino';

/**
 * Application logger instance.
 */
export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport:
    process.env.NODE_ENV === 'development'
      ? {
          target: 'pino-pretty',
          options: { translateTime: true },
        }
      : undefined,
});
