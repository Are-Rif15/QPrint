/**
 * Payment rules.
 *
 * Pure functions only, like business/pricing.js: routes ask these instead of
 * repeating the conditions inline, and the tests can call them directly.
 *
 * A payment moves an order from pending_payment to pending_verification.
 * The owner confirms or rejects it in Milestone 4; after a rejection the
 * student may upload a new proof.
 */

/** Rejected proofs can be replaced a few times before the owner steps in. */
export const MAX_PAYMENT_ATTEMPTS = 5;

/** Payment proofs are screenshots or receipts; DOCX makes no sense here. */
export const PROOF_KINDS = ['pdf', 'jpeg', 'png'];

const PROOF_EXTENSIONS = {
  pdf: '.pdf',
  jpeg: '.jpg',
  png: '.png',
};

/** True when this order status allows the student to send a proof. */
export function canSubmitProof(status) {
  return status === 'pending_payment' || status === 'rejected';
}

/** Students may withdraw an order only before any money is confirmed. */
export function canCancelOrder(status) {
  return status === 'pending_payment' || status === 'rejected';
}

/** Short human reference for bank transfers, e.g. QP-000042. */
export function paymentReference(orderId) {
  if (!Number.isInteger(orderId) || orderId < 1) {
    throw new TypeError('orderId must be a positive whole number.');
  }
  return `QP-${String(orderId).padStart(6, '0')}`;
}

/** Canonical file extension for a detected proof kind. */
export function proofExtension(kind) {
  const extension = PROOF_EXTENSIONS[kind];
  if (!extension) {
    throw new TypeError(`"${kind}" is not an accepted payment proof type.`);
  }
  return extension;
}
