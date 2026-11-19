/**
 * Read the current price table from the database.
 * The owner settings page (Milestone 4) will write to the same table.
 */
import { db } from '../db.js';

export function getPrices() {
  const rows = db
    .prepare('SELECT colour_mode, price_per_page FROM price_config')
    .all();

  const prices = {};
  for (const row of rows) {
    prices[row.colour_mode] = row.price_per_page;
  }

  if (!Number.isFinite(prices.bw) || !Number.isFinite(prices.colour)) {
    throw new Error(
      'Price configuration is incomplete. Run "npm run init:db" to restore the defaults.',
    );
  }

  return { bw: prices.bw, colour: prices.colour };
}
