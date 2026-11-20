/**
 * Public (unauthenticated) endpoints.
 *
 * Keep this surface small: students only need shop information and prices.
 * The payment QR path and every order detail stay owner-only.
 */
import { Router } from 'express';
import fs from 'node:fs';
import { getSettings } from '../lib/settings.js';
import { getPrices } from '../lib/prices.js';
import { isOfficeAvailable } from '../lib/office.js';
import {
  getPaymentQrPath,
  paymentQrAvailable,
  paymentQrContentType,
} from '../lib/paymentQr.js';

export const publicRouter = Router();

publicRouter.get('/health', (req, res) => {
  res.json({ ok: true, service: 'qprint', time: new Date().toISOString() });
});

publicRouter.get('/public/shop', (req, res) => {
  const settings = getSettings([
    'shop_open',
    'operating_hours_text',
    'pickup_location',
    'max_upload_mb',
  ]);

  res.json({
    shopOpen: settings.shop_open === 'true',
    operatingHoursText: settings.operating_hours_text ?? '',
    pickupLocation: settings.pickup_location ?? '',
    maxUploadMb: Number(settings.max_upload_mb) || 10,
    // DOCX/JPG/PNG uploads need LibreOffice on this laptop. The order page
    // uses this only to show a helpful notice; the upload endpoint enforces it.
    officeAvailable: isOfficeAvailable(),
    // The tracking page shows the QR instead of a broken image when unset.
    paymentQrAvailable: paymentQrAvailable(),
  });
});

// The shop's DuitNow QR. Public by design: the same image hangs in the shop.
// Only files inside storage/qr are ever served (see lib/paymentQr.js).
publicRouter.get('/public/payment-qr', (req, res) => {
  const qrPath = getPaymentQrPath();
  if (!qrPath) {
    return res.status(404).json({ error: 'The payment QR is not configured yet.' });
  }

  res.setHeader('Content-Type', paymentQrContentType(qrPath));
  res.setHeader('Cache-Control', 'no-store');
  fs.createReadStream(qrPath).pipe(res);
});

publicRouter.get('/public/pricing', (req, res) => {
  try {
    res.json({ prices: getPrices() });
  } catch (err) {
    console.error('[pricing]', err.message);
    res.status(500).json({ error: 'Prices are not configured yet. Please try again later.' });
  }
});
