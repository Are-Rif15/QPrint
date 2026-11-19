/**
 * Malaysian phone number validation (deliberately loose).
 *
 * Accepts common ways students type a number:
 *   012-345 6789, 0123456789, +60 12-345 6789, 03 2233 4455
 *
 * Normalises to local format with a leading 0, e.g. "0123456789", so later
 * rules (like the unpaid-order limit per phone) compare the same value.
 * Returns null when the number does not look like a Malaysian number.
 */
export function normalizeMalaysianPhone(input) {
  if (typeof input !== 'string') return null;

  const digits = input.replace(/\D/g, '');
  if (!digits) return null;

  // +60 12-345 6789 -> 60123456789 -> 0123456789
  const local = digits.startsWith('60') ? `0${digits.slice(2)}` : digits;

  // 9 to 11 digits, starting with 0 (mobile 01x..., landline 03/04/...).
  if (!/^0\d{8,10}$/.test(local)) return null;

  return local;
}
