/**
 * Public order tracking and payment proof upload.
 *
 * Everything here is authenticated by the 64-character token in the URL, which
 * only the student has. Nothing exposes file paths, phone numbers or the
 * shop's private files; payment proofs go to storage/proofs and are reviewed
 * by the owner in Milestone 4.
 */
import { Router } from 'express';
import multer from 'multer';
import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { db } from '../db.js';
import { storagePaths } from '../lib/storage.js';
import { detectFileKind } from '../lib/filetype.js';
import { maxUploadBytes, maxUploadMb } from '../lib/uploadLimits.js';
import { isPublicToken } from '../lib/tokens.js';
import {
  buildOrderView,
  countPaymentAttempts,
  findOrderByToken,
} from '../lib/orderView.js';
import {
  MAX_PAYMENT_ATTEMPTS,
  PROOF_KINDS,
  canCancelOrder,
  canSubmitProof,
  paymentReference,
  proofExtension,
} from '../business/payments.js';
import { assertTransition } from '../business/status.js';

export const orderTrackingRouter = Router();

const NOT_FOUND = { error: 'Order not found. Check the link and try again.' };

/** Load the order for a token, or send a 404 and return null. */
function orderForToken(req, res) {
  if (!isPublicToken(req.params.token)) {
    res.status(404).json(NOT_FOUND);
    return null;
  }

  const order = findOrderByToken(req.params.token);
  if (!order) {
    res.status(404).json(NOT_FOUND);
    return null;
  }

  return order;
}

/** Why this status does not accept a proof (used for the 409 message). */
function proofBlockedMessage(status) {
  if (status === 'pending_verification') {
    return 'Your payment proof is already waiting for the shop to check it.';
  }
  if (status === 'rejected') {
    return 'Upload a new proof to try again.';
  }
  if (status === 'cancelled') {
    return 'This order was cancelled, so no payment is needed.';
  }
  return 'This order has already been paid for, so no further proof is needed.';
}

// ── My orders on this device ────────────────────────────────────────────────
// One batch request keeps the list page to a single round trip. Only summary
// fields are returned; the owner dashboard has its own endpoints later.

const lookupSchema = z.object({
  tokens: z.array(z.string()).max(25).optional().default([]),
});

orderTrackingRouter.post('/lookup', (req, res) => {
  const parsed = lookupSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return res.status(400).json({ error: 'Could not read the saved order list.' });
  }

  const tokens = [...new Set(parsed.data.tokens.filter(isPublicToken))];
  if (tokens.length === 0) return res.json({ orders: [] });

  const placeholders = tokens.map(() => '?').join(', ');
  const rows = db
    .prepare(
      `SELECT o.id, o.public_token, o.status, o.total_price, o.created_at,
              (SELECT COUNT(*) FROM order_items i WHERE i.order_id = o.id) AS item_count
       FROM orders o
       WHERE o.public_token IN (${placeholders})
       ORDER BY o.created_at DESC`,
    )
    .all(...tokens);

  return res.json({
    orders: rows.map((row) => ({
      token: row.public_token,
      reference: paymentReference(row.id),
      status: row.status,
      totalPrice: row.total_price,
      createdAt: row.created_at,
      itemCount: row.item_count,
    })),
  });
});

// ── One order ───────────────────────────────────────────────────────────────

orderTrackingRouter.get('/:token', (req, res) => {
  const order = orderForToken(req, res);
  if (!order) return;

  res.setHeader('Cache-Control', 'no-store');
  return res.json({ order: buildOrderView(order) });
});

// ── Payment proof ───────────────────────────────────────────────────────────

orderTrackingRouter.post('/:token/payments', (req, res, next) => {
  const order = orderForToken(req, res);
  if (!order) return;

  if (!canSubmitProof(order.status)) {
    return res.status(409).json({ error: proofBlockedMessage(order.status) });
  }

  const attempts = countPaymentAttempts(order.id);
  if (attempts >= MAX_PAYMENT_ATTEMPTS) {
    return res.status(429).json({
      error: `You have already sent ${MAX_PAYMENT_ATTEMPTS} proofs. Please contact the shop directly.`,
    });
  }

  // The limit comes from the database, so build a multer instance per request.
  const receiveFile = multer({
    storage: multer.memoryStorage(),
    limits: { files: 1, fileSize: maxUploadBytes() },
  }).single('proof');

  receiveFile(req, res, async (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(413).json({
            error: `That proof is too large. The limit is ${maxUploadMb()} MB.`,
          });
        }
        return res.status(400).json({ error: 'Attach one proof file and try again.' });
      }
      return next(err);
    }

    if (!req.file || !req.file.buffer?.length) {
      return res.status(400).json({
        error: 'Choose a screenshot or PDF of your payment.',
      });
    }

    const kind = detectFileKind(req.file.buffer, req.file.originalname);
    if (!PROOF_KINDS.includes(kind)) {
      return res.status(400).json({
        error: 'The proof must be a JPG, PNG or PDF file, and the contents must match its extension.',
      });
    }

    const storedPath = path.join(
      storagePaths.proofs,
      `${randomUUID()}${proofExtension(kind)}`,
    );

    try {
      fs.mkdirSync(storagePaths.proofs, { recursive: true });
      fs.writeFileSync(storedPath, req.file.buffer);

      const submitProof = db.transaction(() => {
        assertTransition(order.status, 'pending_verification');

        // Guarded update: if another upload changed the status first, nothing
        // is written and the file is removed below.
        const changed = db
          .prepare(
            `UPDATE orders
             SET status = 'pending_verification',
                 updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
             WHERE id = ? AND status = ?`,
          )
          .run(order.id, order.status);

        if (changed.changes !== 1) throw new Error('PAYMENT_CONFLICT');

        db.prepare(
          `INSERT INTO payments (order_id, amount, proof_path, status)
           VALUES (?, ?, ?, 'pending')`,
        ).run(order.id, order.total_price, storedPath);

        db.prepare(
          'INSERT INTO status_log (order_id, status) VALUES (?, ?)',
        ).run(order.id, 'pending_verification');
      });

      submitProof();
    } catch (submitError) {
      fs.rmSync(storedPath, { force: true });

      if (submitError.message === 'PAYMENT_CONFLICT') {
        return res.status(409).json({
          error: 'This order was just updated. Refresh the page and try again.',
        });
      }
      return next(submitError);
    }

    const fresh = findOrderByToken(req.params.token);
    return res.status(201).json({ order: buildOrderView(fresh) });
  });
});

// ── Student cancellation ────────────────────────────────────────────────────

orderTrackingRouter.post('/:token/cancel', (req, res) => {
  const order = orderForToken(req, res);
  if (!order) return;

  if (!canCancelOrder(order.status)) {
    return res.status(409).json({
      error: 'This order can no longer be cancelled. Please contact the shop.',
    });
  }

  try {
    assertTransition(order.status, 'cancelled');

    const cancel = db.transaction(() => {
      const changed = db
        .prepare(
          `UPDATE orders
           SET status = 'cancelled',
               updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
           WHERE id = ? AND status = ?`,
        )
        .run(order.id, order.status);

      if (changed.changes !== 1) throw new Error('PAYMENT_CONFLICT');

      db.prepare(
        'INSERT INTO status_log (order_id, status) VALUES (?, ?)',
      ).run(order.id, 'cancelled');
    });

    cancel();
  } catch (err) {
    if (err.message === 'PAYMENT_CONFLICT') {
      return res.status(409).json({
        error: 'This order was just updated. Refresh the page and try again.',
      });
    }
    throw err;
  }

  const fresh = findOrderByToken(req.params.token);
  return res.json({ order: buildOrderView(fresh) });
});
