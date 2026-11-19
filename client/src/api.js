/**
 * Fetch wrapper.
 *
 * All requests go to /api on the same origin (Vite proxies this in dev and
 * Express serves everything in production), so cookies are sent normally.
 */
const API_BASE = '/api';

async function request(path, { method = 'GET', body, formData = false } = {}) {
  let response;

  const options = {
    method,
    credentials: 'same-origin',
  };

  if (body !== undefined) {
    if (formData) {
      // Let the browser set the multipart boundary itself.
      options.body = body;
    } else {
      options.headers = { 'Content-Type': 'application/json' };
      options.body = JSON.stringify(body);
    }
  }

  try {
    response = await fetch(`${API_BASE}${path}`, options);
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
  upload: (path, formData) => request(path, { method: 'POST', body: formData, formData: true }),
  delete: (path) => request(path, { method: 'DELETE' }),
};
