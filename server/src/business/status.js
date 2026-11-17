/**
 * Order status rules.
 *
 * Business rule: a status may only move along an allowed edge in this graph.
 * Every route that changes a status must call assertTransition() first, so the
 * rule lives in one place instead of being repeated in route handlers.
 *
 *   pending_payment -> pending_verification -> queued -> printing -> ready -> collected
 *                              |                  ^         |
 *                              v                  +---------+  (retry after print failure)
 *                         rejected -> pending_verification
 *
 * cancelled is reachable from the unpaid/not-yet-printing stages only.
 */

export const ORDER_STATUSES = [
  'pending_payment',
  'pending_verification',
  'queued',
  'printing',
  'ready',
  'collected',
  'rejected',
  'cancelled',
];

/** Which statuses may follow each status. */
export const ALLOWED_TRANSITIONS = {
  pending_payment: ['pending_verification', 'cancelled'],
  pending_verification: ['queued', 'rejected', 'cancelled'],
  rejected: ['pending_verification', 'cancelled'],
  queued: ['printing', 'cancelled'],
  printing: ['ready', 'queued'],
  ready: ['collected'],
  collected: [],
  cancelled: [],
};

export class InvalidTransitionError extends Error {
  constructor(from, to) {
    super(`An order cannot move from "${from}" to "${to}".`);
    this.name = 'InvalidTransitionError';
    this.code = 'INVALID_STATUS_TRANSITION';
    this.from = from;
    this.to = to;
  }
}

/** True when `from -> to` is a legal move. */
export function canTransition(from, to) {
  if (!Object.hasOwn(ALLOWED_TRANSITIONS, from)) return false;
  if (!ORDER_STATUSES.includes(to)) return false;
  return ALLOWED_TRANSITIONS[from].includes(to);
}

/** Throw InvalidTransitionError unless `from -> to` is legal. */
export function assertTransition(from, to) {
  if (!canTransition(from, to)) {
    throw new InvalidTransitionError(from, to);
  }
}
