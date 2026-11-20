/**
 * Upload size limits.
 *
 * The owner can change `max_upload_mb` in the settings page (Milestone 4), so
 * the value is read from the database per request instead of cached at
 * startup. A hard ceiling keeps a bad setting from exhausting laptop memory.
 */
import { getSetting } from './settings.js';

export function maxUploadMb() {
  const configured = Number.parseFloat(getSetting('max_upload_mb', '10'));
  if (!Number.isFinite(configured) || configured <= 0) return 10;
  return Math.min(Math.max(configured, 1), 50);
}

export function maxUploadBytes() {
  return Math.round(maxUploadMb() * 1024 * 1024);
}
