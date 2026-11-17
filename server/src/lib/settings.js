/**
 * Small helpers for the key/value `settings` table.
 */
import { db } from '../db.js';

/** Read one setting, returning `fallback` when the key does not exist. */
export function getSetting(key, fallback = null) {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  return row ? row.value : fallback;
}

/** Create or update one setting. Used by the owner settings page later. */
export function setSetting(key, value) {
  db.prepare(
    `INSERT INTO settings (key, value) VALUES (?, ?)
     ON CONFLICT (key) DO UPDATE SET value = excluded.value`,
  ).run(key, String(value));
}

/** Read several settings at once as a plain object. */
export function getSettings(keys) {
  const result = {};
  for (const key of keys) {
    result[key] = getSetting(key);
  }
  return result;
}
