/**
 * Mirrors server/src/lib/phone.js so the form can give instant feedback.
 * The server always validates again when the order is created.
 */
export function isValidMalaysianPhone(input) {
  if (typeof input !== 'string') return false;

  const digits = input.replace(/\D/g, '');
  if (!digits) return false;

  const local = digits.startsWith('60') ? `0${digits.slice(2)}` : digits;
  return /^0\d{8,10}$/.test(local);
}
