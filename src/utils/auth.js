import bcrypt from 'bcrypt';
import config from 'config';
import jwt from 'jsonwebtoken';

const authConfig = config.get('auth');
const jwtSecret = process.env.JWT_SECRET || authConfig.jwtSecret;

/**
 * Hashes a plaintext password using bcrypt.
 * @param {string} password - Plaintext password.
 * @returns {Promise<string>} Bcrypt hash.
 */
export async function hashPassword(password) {
  const rounds = authConfig.bcryptRounds || 10;
  return bcrypt.hash(password, rounds);
}

/**
 * Verifies a plaintext password against a hash.
 * @param {string} password - Plaintext password.
 * @param {string} hash - Bcrypt hash.
 * @returns {Promise<boolean>} Whether the password matches.
 */
export async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

/**
 * Generates a JWT with provided payload.
 * @param {object} payload - Claims to embed.
 * @param {string} [expiresIn=authConfig.tokenExpiresIn] - Expiration window.
 * @returns {string} Signed JWT.
 */
export function generateToken(payload, expiresIn = authConfig.tokenExpiresIn) {
  return jwt.sign(payload, jwtSecret, { expiresIn });
}

/**
 * Verifies a JWT and returns its payload.
 * @param {string} token - JWT token string.
 * @returns {object} Decoded payload.
 */
export function verifyToken(token) {
  return jwt.verify(token, jwtSecret);
}
