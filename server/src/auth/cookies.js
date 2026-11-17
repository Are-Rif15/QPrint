/**
 * Tiny cookie helpers.
 *
 * Express can SET cookies with res.cookie(), but reading them normally needs
 * the `cookie-parser` package. We only need one cookie, so parsing the header
 * ourselves keeps the dependency list small.
 */
import { config } from '../config.js';

/** Parse a Cookie header such as "a=1; b=hello%20there" into an object. */
export function parseCookies(header = '') {
  const cookies = Object.create(null);

  for (const part of header.split(';')) {
    const separator = part.indexOf('=');
    if (separator === -1) continue;

    const name = part.slice(0, separator).trim();
    const rawValue = part.slice(separator + 1).trim();
    if (!name) continue;

    try {
      cookies[name] = decodeURIComponent(rawValue);
    } catch {
      cookies[name] = rawValue;
    }
  }

  return cookies;
}

/** Read the JWT cookie from an incoming request. */
export function readAuthCookie(req) {
  return parseCookies(req.headers.cookie)[config.cookieName] ?? null;
}

// httpOnly stops JavaScript from reading the token (XSS protection).
// sameSite=lax also blocks cross-site form POSTs, which covers CSRF for now.
// secure is enabled in production, where Cloudflare Tunnel provides HTTPS.
const baseCookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  secure: config.isProduction,
  path: '/',
};

export function setAuthCookie(res, token) {
  res.cookie(config.cookieName, token, {
    ...baseCookieOptions,
    maxAge: config.cookieMaxAgeMs,
  });
}

export function clearAuthCookie(res) {
  res.clearCookie(config.cookieName, baseCookieOptions);
}
