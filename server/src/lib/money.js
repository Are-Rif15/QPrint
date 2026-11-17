/**
 * Money helpers.
 *
 * All amounts are Malaysian Ringgit stored as REAL. Floating point maths can
 * produce values like 0.30000000000000004, so every calculation must pass its
 * result through roundRm() before saving or displaying it.
 */

/** Round an RM amount to 2 decimals (sen). */
export function roundRm(value) {
  if (!Number.isFinite(value)) {
    throw new TypeError(`roundRm expects a finite number, received ${value}`);
  }
  // The small epsilon nudges values like 1.005 (stored as 1.00499999...) up.
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/** Format an RM amount for display, e.g. 0.5 -> "RM 0.50". */
export function formatRm(value) {
  return `RM ${roundRm(value).toFixed(2)}`;
}
