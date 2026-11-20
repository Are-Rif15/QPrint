/**
 * The owner's payment QR image.
 *
 * `settings.payment_qr_path` is written by the owner settings page (Milestone
 * 4) or by `npm run set:payment-qr` for now. Only files inside storage/qr are
 * served, so a bad or malicious setting cannot turn this route into an
 * arbitrary file reader.
 */
import fs from 'node:fs';
import path from 'node:path';
import { getSetting } from './settings.js';
import { storagePaths } from './storage.js';

const CONTENT_TYPES = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
};

/** Absolute path of a usable QR file, or null when none is configured. */
export function getPaymentQrPath() {
  const configured = String(getSetting('payment_qr_path', '') || '').trim();
  if (!configured) return null;

  const filePath = path.resolve(configured);
  const qrRoot = path.resolve(storagePaths.qr);

  // path.relative keeps this safe on Windows: a sibling folder sharing the
  // prefix (e.g. storage/qr-old) does not pass the check.
  const relative = path.relative(qrRoot, filePath);
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) return null;

  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) return null;
  return filePath;
}

export function paymentQrAvailable() {
  return getPaymentQrPath() !== null;
}

export function paymentQrContentType(filePath) {
  return CONTENT_TYPES[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
}
