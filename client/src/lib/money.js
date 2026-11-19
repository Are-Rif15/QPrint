/**
 * Client-side money formatting only.
 *
 * The server is the source of truth for prices; this is used for the live
 * estimate and display. Keep the rounding rule identical to the server.
 */
export function roundRm(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function formatRm(value) {
  return `RM ${roundRm(value).toFixed(2)}`;
}
