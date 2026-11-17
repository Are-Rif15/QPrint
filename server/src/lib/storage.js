/**
 * All local storage paths in one place.
 *
 * Files are stored OUTSIDE the public web root. Nothing in /storage is ever
 * served statically; the owner downloads documents through an authenticated
 * API route (Milestone 4).
 */
import fs from 'node:fs';
import path from 'node:path';
import { config } from '../config.js';

export const storagePaths = {
  documents: path.join(config.storageDir, 'documents'),
  proofs: path.join(config.storageDir, 'proofs'),
  qr: path.join(config.storageDir, 'qr'),
};

/** Create the runtime folders. Safe to call repeatedly. */
export function ensureStorageDirs() {
  const dirs = [
    config.storageDir,
    config.backupsDir,
    ...Object.values(storagePaths),
  ];

  for (const dir of dirs) {
    fs.mkdirSync(dir, { recursive: true });
  }
}
