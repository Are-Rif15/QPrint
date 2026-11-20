/**
 * Display metadata for order statuses.
 *
 * Mirrors server/src/business/status.js. The server remains the authority on
 * which transitions are allowed; this file only decides labels and colours.
 */
export const STATUS_META = {
  pending_payment: {
    label: 'Pending payment',
    badge: 'bg-amber-100 text-amber-900',
    hint: 'Scan the QR, pay the exact amount, then upload your receipt.',
  },
  pending_verification: {
    label: 'Waiting for verification',
    badge: 'bg-sky-100 text-sky-900',
    hint: 'The shop is checking your payment proof.',
  },
  rejected: {
    label: 'Payment rejected',
    badge: 'bg-red-100 text-red-800',
    hint: 'Your proof could not be verified. Upload a new one to try again.',
  },
  queued: {
    label: 'Queued for printing',
    badge: 'bg-indigo-100 text-indigo-900',
    hint: 'Payment confirmed. Your order is in the print queue.',
  },
  printing: {
    label: 'Printing',
    badge: 'bg-violet-100 text-violet-900',
    hint: 'Your pages are printing now.',
  },
  ready: {
    label: 'Ready for pickup',
    badge: 'bg-emerald-100 text-emerald-800',
    hint: 'Your pages are waiting for you.',
  },
  collected: {
    label: 'Collected',
    badge: 'bg-slate-200 text-slate-700',
    hint: 'This order has been collected. Thank you!',
  },
  cancelled: {
    label: 'Cancelled',
    badge: 'bg-slate-200 text-slate-600',
    hint: 'This order was cancelled and will not be printed.',
  },
};

export function statusMeta(status) {
  return (
    STATUS_META[status] ?? {
      label: status || 'Unknown status',
      badge: 'bg-slate-100 text-slate-600',
      hint: '',
    }
  );
}

/** Collected and cancelled orders will never change again. */
export function isTerminalStatus(status) {
  return status === 'collected' || status === 'cancelled';
}
