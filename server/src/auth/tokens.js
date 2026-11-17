/**
 * Create and verify the owner's JWT.
 *
 * The token is small: it only identifies the user and their role. Anything
 * else (name, email) is read from the database on each request so changes take
 * effect immediately.
 */
import jwt from 'jsonwebtoken';
import { config } from '../config.js';

export function signAuthToken(user) {
  return jwt.sign({ role: user.role }, config.jwtSecret, {
    subject: String(user.id),
    expiresIn: config.jwtExpiresIn,
    algorithm: 'HS256',
  });
}

/** Return the token payload, or null when the token is missing/expired/tampered. */
export function verifyAuthToken(token) {
  try {
    return jwt.verify(token, config.jwtSecret, { algorithms: ['HS256'] });
  } catch {
    return null;
  }
}
