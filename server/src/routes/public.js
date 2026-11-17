/**
 * Public (unauthenticated) endpoints.
 *
 * Keep this surface small: students only need basic shop information. The
 * payment QR path and every order detail stay owner-only.
 */
import { Router } from 'express';
import { getSettings } from '../lib/settings.js';

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
  });
});
