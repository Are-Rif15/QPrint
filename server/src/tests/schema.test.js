import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';

const here = path.dirname(fileURLToPath(import.meta.url));
const schema = fs.readFileSync(path.join(here, '..', 'schema.sql'), 'utf8');

function freshDatabase() {
  const db = new Database(':memory:');
  db.exec(schema);
  return db;
}

test('schema creates every Phase 1 table', () => {
  const db = freshDatabase();
  const tables = db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")
    .all()
    .map((row) => row.name);

  for (const expected of [
    'users',
    'orders',
    'order_items',
    'uploads',
    'payments',
    'status_log',
    'price_config',
    'settings',
  ]) {
    assert.ok(tables.includes(expected), `missing table: ${expected}`);
  }

  db.close();
});

test('orders get sensible defaults', () => {
  const db = freshDatabase();
  db.prepare(
    `INSERT INTO orders (customer_name, customer_phone, public_token)
     VALUES (?, ?, ?)`,
  ).run('Aisyah', '0123456789', 'a'.repeat(32));

  const order = db
    .prepare('SELECT status, pickup_method, total_price FROM orders WHERE public_token = ?')
    .get('a'.repeat(32));

  assert.equal(order.status, 'pending_payment');
  assert.equal(order.pickup_method, 'pickup');
  assert.equal(order.total_price, 0);

  db.close();
});

test('database rejects statuses outside the allowed list', () => {
  const db = freshDatabase();

  assert.throws(
    () =>
      db
        .prepare(
          `INSERT INTO orders (customer_name, customer_phone, public_token, status)
           VALUES (?, ?, ?, ?)`,
        )
        .run('Aisyah', '0123456789', 'b'.repeat(32), 'flying'),
    (err) => err.code === 'SQLITE_CONSTRAINT_CHECK',
  );

  db.close();
});

test('deleting an order cascades to its items and status log', () => {
  const db = freshDatabase();

  const orderId = db
    .prepare(
      `INSERT INTO orders (customer_name, customer_phone, public_token)
       VALUES (?, ?, ?)`,
    )
    .run('Aisyah', '0123456789', 'c'.repeat(32)).lastInsertRowid;

  db.prepare(
    `INSERT INTO order_items
       (order_id, original_name, page_count, copies, colour_mode, item_price)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(orderId, 'notes.pdf', 2, 1, 'bw', 0.2);

  db.prepare('INSERT INTO status_log (order_id, status) VALUES (?, ?)').run(
    orderId,
    'pending_payment',
  );

  db.prepare('DELETE FROM orders WHERE id = ?').run(orderId);

  assert.equal(
    db.prepare('SELECT COUNT(*) AS n FROM order_items').get().n,
    0,
  );
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM status_log').get().n, 0);

  db.close();
});
