/**
 * Public order tokens.
 *
 * A student's tracking link is the only credential they have, so the token is
 * 32 random bytes rendered as 64 lowercase hex characters. Validate the shape
 * before touching the database so junk URLs never reach a query.
 */
export const PUBLIC_TOKEN_PATTERN = /^[a-f0-9]{64}$/;

export function isPublicToken(value) {
  return typeof value === 'string' && PUBLIC_TOKEN_PATTERN.test(value);
}
