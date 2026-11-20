/**
 * Set the shop's payment QR image.
 *
 * Temporary convenience until Milestone 4 adds the owner settings page:
 *
 *   npm run set:payment-qr -- "C:\path\to\duitnow-qr.png"
 *
 * The file is validated by magic bytes, copied into storage/qr and its path is
 * written to settings.payment_qr_path. Only PNG and JPG are accepted.
 */
import fs from 'node:fs';
import path from 'node:path';
import { db } from '../db.js';
import { storagePaths, ensureStorageDirs } from '../lib/storage.js';
import { detectFileKind } from '../lib/filetype.js';
import { setSetting } from '../lib/settings.js';

const QR_KINDS = ['png', 'jpeg'];

function fail(message) {
  console.error(`\n[set:payment-qr] ${message}\n`);
  db.close();
  process.exit(1);
}

const source = process.argv[2];

if (!source) {
  fail(
    'Missing image path.\n' +
      'Usage: npm run set:payment-qr -- "C:\\path\\to\\duitnow-qr.png"',
  );
}

const sourcePath = path.resolve(source);
if (!fs.existsSync(sourcePath) || !fs.statSync(sourcePath).isFile()) {
  fail(`File not found: ${sourcePath}`);
}

const buffer = fs.readFileSync(sourcePath);
const kind = detectFileKind(buffer, sourcePath);

if (!QR_KINDS.includes(kind)) {
  fail('The QR image must be a real PNG or JPG file (the contents must match its extension).');
}

ensureStorageDirs();

// Remove any previous QR so the folder never holds two payment codes.
for (const name of fs.readdirSync(storagePaths.qr)) {
  if (name.startsWith('payment-qr.')) {
    fs.rmSync(path.join(storagePaths.qr, name), { force: true });
  }
}

const extension = kind === 'png' ? '.png' : '.jpg';
const targetPath = path.join(storagePaths.qr, `payment-qr${extension}`);
fs.copyFileSync(sourcePath, targetPath);
setSetting('payment_qr_path', targetPath);

console.log('[set:payment-qr] Saved payment QR.');
console.log(`[set:payment-qr] File: ${targetPath}`);
console.log('[set:payment-qr] Students will see it on the order tracking page.');
db.close();
