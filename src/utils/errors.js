/**
 * Base application error with HTTP status and code.
 */
export class AppError extends Error {
  /**
   * @param {string} message - Error message.
   * @param {number} statusCode - HTTP status code.
   * @param {string} code - Application-specific error code.
   */
  constructor(message, statusCode = 500, code = 'APP_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
  }
}

/**
 * Validation error (400).
 */
export class ValidationError extends AppError {
  constructor(message, code = 'VALIDATION_ERROR') {
    super(message, 400, code);
  }
}

/**
 * Authentication error (401).
 */
export class AuthError extends AppError {
  constructor(message = 'Unauthorized', code = 'AUTH_ERROR') {
    super(message, 401, code);
  }
}

/**
 * Forbidden error (403).
 */
export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden', code = 'FORBIDDEN') {
    super(message, 403, code);
  }
}

/**
 * Not found error (404).
 */
export class NotFoundError extends AppError {
  constructor(message = 'Not found', code = 'NOT_FOUND') {
    super(message, 404, code);
  }
}
