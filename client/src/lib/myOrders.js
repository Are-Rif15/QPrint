/**
 * "My orders on this device".
 *
 * Guests have no account, so the browser remembers the public tokens of the
 * orders placed here. That is enough to reopen the tracking pages. The list is
 * capped and kept in localStorage only; clearing site data forgets the orders.
 */
const STORAGE_KEY = 'qprint.orders.v1';
const MAX_ORDERS = 25;

function readTokens() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(parsed)
      ? parsed.filter((token) => typeof token === 'string' && token.length > 0)
      : [];
  } catch {
    // Private mode, disabled storage or corrupt JSON: behave like an empty list.
    return [];
  }
}

function writeTokens(tokens) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tokens.slice(0, MAX_ORDERS)));
  } catch {
    // Remembering orders is a convenience, never a reason to break ordering.
  }
}

/** Newest first. */
export function listMyOrders() {
  return readTokens();
}

/** Move an existing token to the top instead of duplicating it. */
export function addMyOrder(token) {
  if (typeof token !== 'string' || token.length === 0) return;
  writeTokens([token, ...readTokens().filter((entry) => entry !== token)]);
}

export function forgetMyOrder(token) {
  writeTokens(readTokens().filter((entry) => entry !== token));
}
