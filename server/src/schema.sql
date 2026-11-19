-- ---------------------------------------------------------------------------
-- QPrint database schema (SQLite)
--
-- The whole Phase 1 schema is created in Milestone 1 so later milestones only
-- add code, not structural changes. Run `npm run init:db` to apply it.
--
-- Timestamps are stored as ISO-8601 UTC strings (e.g. 2026-11-11T08:30:00.000Z).
-- Money is stored as REAL in Malaysian Ringgit (RM) and must be rounded to
-- 2 decimals in code (see server/src/lib/money.js).
-- ---------------------------------------------------------------------------

PRAGMA foreign_keys = ON;

-- The only account type in Phase 1 is 'owner'. 'student' is allowed by the
-- CHECK so Phase 2 can reuse the table without a migration.
CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT    NOT NULL,
  email         TEXT    NOT NULL UNIQUE,
  password_hash TEXT    NOT NULL,
  role          TEXT    NOT NULL DEFAULT 'owner' CHECK (role IN ('owner', 'student')),
  created_at    TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- An order is placed by a guest (no account). public_token is the only thing
-- that lets a student view their order, so it must be long and random.
CREATE TABLE IF NOT EXISTS orders (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_name  TEXT    NOT NULL,
  customer_phone TEXT    NOT NULL,
  public_token   TEXT    NOT NULL UNIQUE,
  user_id        INTEGER REFERENCES users(id) ON DELETE SET NULL,
  status         TEXT    NOT NULL DEFAULT 'pending_payment'
                   CHECK (status IN (
                     'pending_payment',
                     'pending_verification',
                     'queued',
                     'printing',
                     'ready',
                     'collected',
                     'rejected',
                     'cancelled'
                   )),
  pickup_method  TEXT    NOT NULL DEFAULT 'pickup' CHECK (pickup_method IN ('pickup')),
  notes          TEXT,
  total_price    REAL    NOT NULL DEFAULT 0 CHECK (total_price >= 0),
  created_at     TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at     TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  collected_at   TEXT
);

-- One row per uploaded document. file_path may become NULL after the cleanup
-- job (Milestone 6) so order history survives file deletion.
CREATE TABLE IF NOT EXISTS order_items (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id      INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  file_path     TEXT,
  original_name TEXT    NOT NULL,
  page_count    INTEGER NOT NULL CHECK (page_count >= 1),
  copies        INTEGER NOT NULL DEFAULT 1 CHECK (copies >= 1),
  colour_mode   TEXT    NOT NULL CHECK (colour_mode IN ('bw', 'colour')),
  quality       TEXT    NOT NULL DEFAULT 'normal' CHECK (quality IN ('draft', 'normal', 'high')),
  paper_size    TEXT    NOT NULL DEFAULT 'A4' CHECK (paper_size IN ('A4')),
  item_price    REAL    NOT NULL CHECK (item_price >= 0),
  created_at    TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- Temporary uploads that are not yet part of an order.
-- The client uses `token` to preview the converted PDF. Once an order is
-- created, order_id is set and the preview route stops serving the file, so
-- the public order page can never be used to download documents.
CREATE TABLE IF NOT EXISTS uploads (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  token         TEXT    NOT NULL UNIQUE,
  original_name TEXT    NOT NULL,
  stored_path   TEXT    NOT NULL,
  page_count    INTEGER NOT NULL CHECK (page_count >= 1),
  size_bytes    INTEGER NOT NULL CHECK (size_bytes >= 0),
  created_at    TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  order_id      INTEGER REFERENCES orders(id) ON DELETE SET NULL
);

-- A student can re-upload proof after a rejection, hence one row per attempt.
CREATE TABLE IF NOT EXISTS payments (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id      INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  amount        REAL    NOT NULL CHECK (amount >= 0),
  proof_path    TEXT,
  status        TEXT    NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'verified', 'rejected')),
  reject_reason TEXT,
  verified_at   TEXT,
  created_at    TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- Append-only history used to draw the student-facing status timeline.
CREATE TABLE IF NOT EXISTS status_log (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id   INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  status     TEXT    NOT NULL CHECK (status IN (
               'pending_payment',
               'pending_verification',
               'queued',
               'printing',
               'ready',
               'collected',
               'rejected',
               'cancelled'
             )),
  changed_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- One row per colour mode. Editable from the owner settings page (Milestone 4).
CREATE TABLE IF NOT EXISTS price_config (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  colour_mode    TEXT    NOT NULL UNIQUE CHECK (colour_mode IN ('bw', 'colour')),
  price_per_page REAL    NOT NULL CHECK (price_per_page >= 0)
);

-- Simple key/value store for shop settings.
CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_orders_status_created ON orders (status, created_at);
CREATE INDEX IF NOT EXISTS idx_orders_phone           ON orders (customer_phone);
CREATE INDEX IF NOT EXISTS idx_order_items_order      ON order_items (order_id);
CREATE INDEX IF NOT EXISTS idx_uploads_order          ON uploads (order_id);
CREATE INDEX IF NOT EXISTS idx_payments_order         ON payments (order_id);
CREATE INDEX IF NOT EXISTS idx_status_log_order       ON status_log (order_id, changed_at);
