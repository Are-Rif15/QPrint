/**
 * Public order creation.
 *
 * The browser sends only choices (which uploads, copies, colour, quality). The
 * server reads page counts, uses the current price table, and stores the final
 * item_price/total_price. Prices sent by the client are ignored entirely.
 *
 * Payment happens in Milestone 3, so a new order starts as pending_payment.
 */
import { Router } from 'express';
import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import { db } from '../db.js';
import { getSetting } from '../lib/settings.js';
import { normalizeMalaysianPhone } from '../lib/phone.js';
import { getPrices } from '../lib/prices.js';
import { priceOrder } from '../business/pricing.js';

export const ordersRouter = Router();

const orderItemSchema = z.object({
  uploadToken: z.string().min(20).max(100),
  copies: z.number().int().min(1).max(99),
  colourMode: z.enum(['bw', 'colour']),
  quality: z.enum(['draft', 'normal', 'high']),
});

const orderSchema = z.object({
  customerName: z.string().trim().min(2, 'Enter your full name.').max(80),
  customerPhone: z.string().trim().min(1, 'Enter your phone number.').max(30),
  notes: z.string().trim().max(500).optional().default(''),
  items: z.array(orderItemSchema).min(1, 'Add at least one file.').max(20),
});

ordersRouter.post('/', (req, res) => {
  if (getSetting('shop_open', 'true') !== 'true') {
    return res.status(403).json({ error: 'The shop is currently closed. Please try again later.' });
  }

  const parsed = orderSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return res.status(400).json({
      error: parsed.error.issues[0]?.message || 'Please check your order details and try again.',
    });
  }

  const { customerName, customerPhone, notes, items } = parsed.data;

  const phone = normalizeMalaysianPhone(customerPhone);
  if (!phone) {
    return res.status(400).json({
      error: 'Enter a valid Malaysian phone number, for example 012-345 6789.',
    });
  }

  // The same file cannot be ordered twice in one order.
  const tokens = items.map((item) => item.uploadToken);
  const uniqueTokens = [...new Set(tokens)];
  if (uniqueTokens.length !== tokens.length) {
    return res.status(400).json({ error: 'Each file can only appear once in an order.' });
  }

  const placeholders = uniqueTokens.map(() => '?').join(', ');
  const uploadRows = db
    .prepare(
      `SELECT id, token, original_name, stored_path, page_count
       FROM uploads
       WHERE order_id IS NULL AND token IN (${placeholders})`,
    )
    .all(...uniqueTokens);

  const uploadsByToken = new Map(uploadRows.map((row) => [row.token, row]));
  if (uniqueTokens.some((token) => !uploadsByToken.has(token))) {
    return res.status(409).json({
      error: 'One of your files has expired or is already part of an order. Please upload it again.',
    });
  }

  const prices = getPrices();

  let priced;
  try {
    priced = priceOrder(
      items.map((item) => {
        const upload = uploadsByToken.get(item.uploadToken);
        return {
          uploadId: upload.id,
          storedPath: upload.stored_path,
          originalName: upload.original_name,
          pageCount: upload.page_count,
          copies: item.copies,
          colourMode: item.colourMode,
          quality: item.quality,
        };
      }),
      prices,
    );
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }

  const publicToken = randomBytes(32).toString('hex');

  // One transaction: either the order, its items, its first status log row and
  // all upload claims succeed together, or nothing is saved.
  const createOrder = db.transaction(() => {
    const orderResult = db
      .prepare(
        `INSERT INTO orders
           (customer_name, customer_phone, public_token, status, notes, total_price)
         VALUES (?, ?, ?, 'pending_payment', ?, ?)`,
      )
      .run(customerName, phone, publicToken, notes || null, priced.totalPrice);

    const orderId = Number(orderResult.lastInsertRowid);

    const insertItem = db.prepare(
      `INSERT INTO order_items
         (order_id, file_path, original_name, page_count, copies,
          colour_mode, quality, paper_size, item_price)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'A4', ?)`,
    );

    const claimUpload = db.prepare(
      'UPDATE uploads SET order_id = ? WHERE id = ? AND order_id IS NULL',
    );

    for (const item of priced.items) {
      insertItem.run(
        orderId,
        item.storedPath,
        item.originalName,
        item.pageCount,
        item.copies,
        item.colourMode,
        item.quality,
        item.itemPrice,
      );

      const claim = claimUpload.run(orderId, item.uploadId);
      if (claim.changes !== 1) {
        // Another request claimed this upload first; roll everything back.
        throw new Error('UPLOAD_ALREADY_CLAIMED');
      }
    }

    db.prepare('INSERT INTO status_log (order_id, status) VALUES (?, ?)').run(
      orderId,
      'pending_payment',
    );

    return orderId;
  });

  try {
    createOrder();
  } catch (err) {
    if (err.message === 'UPLOAD_ALREADY_CLAIMED') {
      return res.status(409).json({
        error: 'One of your files was just used in another order. Please upload it again.',
      });
    }
    throw err;
  }

  return res.status(201).json({
    order: {
      publicToken,
      status: 'pending_payment',
      totalPrice: priced.totalPrice,
      itemCount: priced.items.length,
      items: priced.items.map((item) => ({
        originalName: item.originalName,
        pageCount: item.pageCount,
        copies: item.copies,
        colourMode: item.colourMode,
        quality: item.quality,
        itemPrice: item.itemPrice,
      })),
    },
  });
});
