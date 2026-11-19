/**
 * Public (unauthenticated) endpoints.
 *
 * Keep this surface small: students only need shop information and prices.
 * The payment QR path and every order detail stay owner-only.
 */
import { Router } from 'express';
import { getSettings } from '../lib/settings.js';
import { getPrices } from '../lib/prices.js';
import { isOfficeAvailable } from '../lib/office.js';

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
  });
});

publicRouter.get('/public/pricing', (req, res) => {
  try {
    res.json({ prices: getPrices() });
  } catch (err) {
    console.error('[pricing]', err.message);
    res.status(500).json({ error: 'Prices are not configured yet. Please try again later.' });
  }
});
