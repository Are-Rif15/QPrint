import { statusMeta } from '../lib/orderStatus.js';

/** Colour-coded pill for an order status. */
export default function StatusBadge({ status }) {
  const meta = statusMeta(status);
  return <span className={`badge shrink-0 ${meta.badge}`}>{meta.label}</span>;
}
