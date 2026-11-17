/**
 * Single shared SQLite connection.
 *
 * better-sqlite3 is synchronous, which keeps the code easy to read: queries
 * return rows directly and run inside the request that needs them.
 */
import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { config } from './config.js';

// better-sqlite3 creates the file if needed, but not its parent folder.
fs.mkdirSync(path.dirname(config.databasePath), { recursive: true });

export const db = new Database(config.databasePath);

// WAL lets reads continue while a write is happening (useful later for the
// print worker), and foreign_keys enforces the REFERENCES in schema.sql.
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.pragma('busy_timeout = 5000');

/**
 * Guard against starting the server before `npm run init:db` has been run.
 * Without this, requests would fail with "no such table" errors.
 */
export function assertDatabaseReady() {
  const row = db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'users'")
    .get();

  if (!row) {
    throw new Error(
      `The database at ${config.databasePath} is not initialised.\n` +
        'Run: npm run init:db',
    );
  }
}
