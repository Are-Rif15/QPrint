/**
 * Database initialiser.
 *
 * Creates the SQLite file, applies schema.sql, and seeds:
 *   - the single owner account (from .env)
 *   - default prices per page
 *   - default shop settings
 *
 * It is safe to run more than once: existing rows are left alone.
 *
 * Usage:
 *   npm run init:db
 *   npm run init:db -- --reset-owner-password   (update hash from .env)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcryptjs';
import { config } from '../config.js';
import { db } from '../db.js';
import { ensureStorageDirs } from '../lib/storage.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const schemaPath = path.join(here, '..', 'schema.sql');

const resetOwnerPassword = process.argv.includes('--reset-owner-password');
const BCRYPT_COST = 12;

function fail(message) {
  console.error(`\n[init:db] ${message}\n`);
  process.exit(1);
}

function applySchema() {
  const schema = fs.readFileSync(schemaPath, 'utf8');
  db.exec(schema);
  console.log('[init:db] Schema applied.');
}

function seedOwner() {
  const { name, email, password } = config.owner;

  const missing = [];
  if (!name) missing.push('OWNER_NAME');
  if (!email) missing.push('OWNER_EMAIL');
  if (!password) missing.push('OWNER_PASSWORD');

  if (missing.length > 0) {
    fail(
      `Missing ${missing.join(', ')} in .env.\n` +
        'Copy .env.example to .env and fill in the owner account values.',
    );
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    fail(`OWNER_EMAIL "${email}" does not look like an email address.`);
  }

  if (password.length < 8) {
    fail('OWNER_PASSWORD must be at least 8 characters long.');
  }

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);

  if (existing && !resetOwnerPassword) {
    console.log(`[init:db] Owner ${email} already exists - left unchanged.`);
    console.log('          Use "npm run init:db -- --reset-owner-password" to update it.');
    return;
  }

  const passwordHash = bcrypt.hashSync(password, BCRYPT_COST);

  if (existing) {
    db.prepare('UPDATE users SET name = ?, password_hash = ? WHERE id = ?').run(
      name,
      passwordHash,
      existing.id,
    );
    console.log(`[init:db] Owner ${email} password reset.`);
  } else {
    db.prepare(
      'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
    ).run(name, email, passwordHash, 'owner');
    console.log(`[init:db] Owner ${email} created.`);
  }
}

function seedPrices() {
  const insert = db.prepare(
    'INSERT OR IGNORE INTO price_config (colour_mode, price_per_page) VALUES (?, ?)',
  );

  insert.run('bw', config.defaultPricesRm.bw);
  insert.run('colour', config.defaultPricesRm.colour);

  const rows = db
    .prepare('SELECT colour_mode, price_per_page FROM price_config ORDER BY colour_mode')
    .all();
  console.log(
    `[init:db] Prices: ${rows
      .map((row) => `${row.colour_mode} RM ${row.price_per_page.toFixed(2)}/page`)
      .join(', ')}`,
  );
}

function seedSettings() {
  const insert = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');

  insert.run('shop_open', config.defaults.shopOpen ? 'true' : 'false');
  insert.run('operating_hours_text', config.defaults.operatingHoursText);
  insert.run('payment_qr_path', ''); // owner uploads this in Milestone 4
  insert.run('pickup_location', config.defaults.pickupLocation);
  insert.run('max_upload_mb', String(config.defaults.maxUploadMb));

  console.log('[init:db] Default settings ensured.');
}

function main() {
  console.log(`[init:db] Database: ${config.databasePath}`);

  ensureStorageDirs();
  applySchema();
  seedOwner();
  seedPrices();
  seedSettings();

  console.log('[init:db] Done.\n');
  console.log('Next steps:');
  console.log('  1. npm run dev        (start API + frontend)');
  console.log('  2. Open http://localhost:5173');
  console.log('  3. Sign in at http://localhost:5173/owner/login\n');
}

try {
  main();
} catch (err) {
  console.error('\n[init:db] Failed:', err.message, '\n');
  process.exit(1);
} finally {
  db.close();
}
