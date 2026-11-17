/**
 * Small fetch wrapper.
 *
 * All requests go to /api on the same origin (Vite proxies this in dev and
 * Express serves everything in production), so cookies are sent normally.
 */
const API_BASE = '/api';

async function request(path, { method = 'GET', body } = {}) {
  let response;

  try {
    response = await fetch(`${API_BASE}${path}`, {
      method,
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      credentials: 'same-origin',
    });
  } catch {
    throw new Error('Could not reach the server. Is it running?');
  }

  // Error responses from Express are JSON too, but be safe if a proxy returns HTML.
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const error = new Error(data?.error || `Request failed (${response.status}).`);
    error.status = response.status;
    throw error;
  }

  return data;
}

export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: 'POST', body }),
};
