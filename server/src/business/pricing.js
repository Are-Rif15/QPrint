/**
 * Price calculation.
 *
 * Pure functions only: they take a price table and return rounded amounts.
 * The server always recalculates with these; a price sent by the browser is
 * ignored.
 *
 * items: [{ pageCount, copies, colourMode }]
 * prices: { bw: 0.10, colour: 0.50 }
 */
import { roundRm } from '../lib/money.js';

function assertPositiveInteger(value, label) {
  if (!Number.isInteger(value) || value < 1) {
    throw new TypeError(`${label} must be a positive whole number.`);
  }
}

/** Price one item for a single print job. */
export function priceItem({ pageCount, copies, colourMode }, prices) {
  assertPositiveInteger(pageCount, 'pageCount');
  assertPositiveInteger(copies, 'copies');

  const pricePerPage = prices?.[colourMode];
  if (!Number.isFinite(pricePerPage) || pricePerPage < 0) {
    throw new TypeError(`No valid price configured for colour mode "${colourMode}".`);
  }

  return roundRm(pageCount * copies * pricePerPage);
}

/** Price a whole order and return item prices plus the rounded total. */
export function priceOrder(items, prices) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new TypeError('An order needs at least one item.');
  }

  const pricedItems = items.map((item) => ({
    ...item,
    itemPrice: priceItem(item, prices),
  }));

  const totalPrice = roundRm(
    pricedItems.reduce((sum, item) => sum + item.itemPrice, 0),
  );

  return { items: pricedItems, totalPrice };
}
