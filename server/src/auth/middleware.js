/**
 * Owner-only route guard.
 *
 * Every protected route is mounted behind this middleware, so ownership is
 * enforced on the server - hiding buttons in the UI is never enough.
 */
import { db } from '../db.js';
import { readAuthCookie } from './cookies.js';
import { verifyAuthToken } from './tokens.js';

export function requireOwner(req, res, next) {
  const token = readAuthCookie(req);
  if (!token) {
    return res.status(401).json({ error: 'Please sign in.' });
  }

  const payload = verifyAuthToken(token);
  if (!payload) {
    return res.status(401).json({ error: 'Your session has expired. Please sign in again.' });
  }

  const user = db
    .prepare('SELECT id, name, email, role FROM users WHERE id = ?')
    .get(Number(payload.sub));

  if (!user || user.role !== 'owner') {
    return res.status(401).json({ error: 'Please sign in.' });
  }

  req.user = user;
  next();
}
