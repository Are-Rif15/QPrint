/**
 * Build the public view of an order.
 *
 * The token in the URL is the student's credential, so this is the only place
 * that decides what a guest may see. File paths, phone numbers and upload
 * tokens never leave the server.
 */
import { db } from '../db.js';
import { getSettings } from './settings.js';
import { maxUploadMb } from './uploadLimits.js';
import { paymentQrAvailable } from './paymentQr.js';
import {
  MAX_PAYMENT_ATTEMPTS,
  canCancelOrder,
  canSubmitProof,
  paymentReference,
} from '../business/payments.js';

export function findOrderByToken(token) {
  return db
    .prepare(
      `SELECT id, customer_name, public_token, status, notes, total_price,
              created_at, updated_at, collected_at
       FROM orders
       WHERE public_token = ?`,
    )
    .get(token);
}

export function countPaymentAttempts(orderId) {
  return db
    .prepare('SELECT COUNT(*) AS count FROM payments WHERE order_id = ?')
    .get(orderId).count;
}

export function buildOrderView(order) {
  const items = db
    .prepare(
      `SELECT original_name, page_count, copies, colour_mode, quality,
              paper_size, item_price
       FROM order_items
       WHERE order_id = ?
       ORDER BY id`,
    )
    .all(order.id);

  const timeline = db
    .prepare(
      `SELECT status, changed_at
       FROM status_log
       WHERE order_id = ?
       ORDER BY changed_at, id`,
    )
    .all(order.id);

  // A rejected order already has an order status of "rejected"; the latest
  // payment row carries the reason so the student knows what went wrong.
  const latestPayment = db
    .prepare(
      `SELECT status, reject_reason, created_at, verified_at
       FROM payments
       WHERE order_id = ?
       ORDER BY id DESC
       LIMIT 1`,
    )
    .get(order.id);

  const settings = getSettings(['pickup_location', 'operating_hours_text']);
  const paymentAttempts = countPaymentAttempts(order.id);

  return {
    token: order.public_token,
    reference: paymentReference(order.id),
    status: order.status,
    customerName: order.customer_name,
    notes: order.notes,
    totalPrice: order.total_price,
    createdAt: order.created_at,
    updatedAt: order.updated_at,
    collectedAt: order.collected_at,
    pickupLocation: settings.pickup_location ?? '',
    operatingHoursText: settings.operating_hours_text ?? '',
    items: items.map((item) => ({
      originalName: item.original_name,
      pageCount: item.page_count,
      copies: item.copies,
      colourMode: item.colour_mode,
      quality: item.quality,
      paperSize: item.paper_size,
      itemPrice: item.item_price,
    })),
    timeline: timeline.map((entry) => ({
      status: entry.status,
      changedAt: entry.changed_at,
    })),
    payment: latestPayment
      ? {
          status: latestPayment.status,
          submittedAt: latestPayment.created_at,
          rejectReason: latestPayment.reject_reason,
          verifiedAt: latestPayment.verified_at,
        }
      : null,
    paymentAttempts,
    maxPaymentAttempts: MAX_PAYMENT_ATTEMPTS,
    maxUploadMb: maxUploadMb(),
    paymentQrAvailable: paymentQrAvailable(),
    canSubmitProof: canSubmitProof(order.status) && paymentAttempts < MAX_PAYMENT_ATTEMPTS,
    canCancel: canCancelOrder(order.status),
  };
}
