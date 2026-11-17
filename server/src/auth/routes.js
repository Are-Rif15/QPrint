/**
 * Owner authentication routes.
 *
 * There is deliberately NO registration endpoint: the owner account is created
 * once by `npm run init:db` from values in .env.
 */
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { db } from '../db.js';
import { requireOwner } from './middleware.js';
import { setAuthCookie, clearAuthCookie } from './cookies.js';
import { signAuthToken } from './tokens.js';

export const authRouter = Router();

/**
 * A real bcrypt hash that no login will ever match. Comparing against it when
 * the email is unknown keeps response times similar, so an attacker cannot
 * discover the owner's email by timing the login endpoint.
 */
const DUMMY_HASH = '$2b$12$YHaVuaoCZ622awfofmklNOFAj9tBXzAm2pMFKYIoS6MAO.YhJ432e';

// Slow down password guessing: 10 attempts per IP per 15 minutes.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Please wait 15 minutes and try again.' },
});

const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(1).max(200),
});

function publicUser(user) {
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}

authRouter.post('/login', loginLimiter, async (req, res) => {
  const parsed = loginSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return res.status(400).json({ error: 'Enter a valid email address and password.' });
  }

  const email = parsed.data.email.trim().toLowerCase();
  const { password } = parsed.data;

  const user = db
    .prepare('SELECT id, name, email, password_hash, role FROM users WHERE email = ?')
    .get(email);

  // Always run a bcrypt comparison, even for an unknown email (see DUMMY_HASH).
  const passwordMatches = await bcrypt.compare(password, user?.password_hash ?? DUMMY_HASH);

  if (!user || !passwordMatches || user.role !== 'owner') {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  setAuthCookie(res, signAuthToken(user));
  return res.json({ user: publicUser(user) });
});

authRouter.post('/logout', (req, res) => {
  clearAuthCookie(res);
  res.json({ ok: true });
});

// The frontend calls this on page load to restore the session after refresh.
authRouter.get('/me', requireOwner, (req, res) => {
  res.json({ user: publicUser(req.user) });
});
