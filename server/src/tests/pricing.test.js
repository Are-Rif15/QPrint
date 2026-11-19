import test from 'node:test';
import assert from 'node:assert/strict';
import { priceItem, priceOrder } from '../business/pricing.js';

const prices = { bw: 0.1, colour: 0.5 };

test('black and white price uses pages x copies x price per page', () => {
  assert.equal(priceItem({ pageCount: 3, copies: 2, colourMode: 'bw' }, prices), 0.6);
});

test('colour price uses the colour rate', () => {
  assert.equal(priceItem({ pageCount: 4, copies: 1, colourMode: 'colour' }, prices), 2);
});

test('order total adds item prices and rounds to sen', () => {
  const result = priceOrder(
    [
      { pageCount: 3, copies: 2, colourMode: 'bw' }, // 0.60
      { pageCount: 1, copies: 3, colourMode: 'colour' }, // 1.50
      { pageCount: 1, copies: 1, colourMode: 'bw' }, // 0.10
    ],
    prices,
  );

  assert.equal(result.totalPrice, 2.2);
  assert.deepEqual(
    result.items.map((item) => item.itemPrice),
    [0.6, 1.5, 0.1],
  );
});

test('awkward rates still produce two-decimal prices', () => {
  const result = priceOrder([{ pageCount: 7, copies: 1, colourMode: 'bw' }], {
    bw: 0.1,
    colour: 0.5,
  });
  assert.equal(result.totalPrice, 0.7);
});

test('invalid quantities or colour modes throw', () => {
  assert.throws(() => priceItem({ pageCount: 0, copies: 1, colourMode: 'bw' }, prices), TypeError);
  assert.throws(() => priceItem({ pageCount: 1, copies: 0, colourMode: 'bw' }, prices), TypeError);
  assert.throws(() => priceItem({ pageCount: 1.5, copies: 1, colourMode: 'bw' }, prices), TypeError);
  assert.throws(() => priceItem({ pageCount: 1, copies: 1, colourMode: 'sepia' }, prices), TypeError);
  assert.throws(() => priceOrder([], prices), TypeError);
});
