import test from 'node:test';
import assert from 'node:assert/strict';
import { roundRm, formatRm } from '../lib/money.js';

test('roundRm removes floating point noise', () => {
  assert.equal(roundRm(0.1 + 0.2), 0.3);
  assert.equal(roundRm(0.1 * 3), 0.3);
});

test('roundRm rounds half up to sen', () => {
  assert.equal(roundRm(1.005), 1.01);
  assert.equal(roundRm(2.344), 2.34);
  assert.equal(roundRm(2.345), 2.35);
});

test('formatRm always shows two decimals with RM prefix', () => {
  assert.equal(formatRm(0.5), 'RM 0.50');
  assert.equal(formatRm(0.1 * 3), 'RM 0.30');
  assert.equal(formatRm(12), 'RM 12.00');
});

test('roundRm rejects non-numbers', () => {
  assert.throws(() => roundRm(Number.NaN), TypeError);
  assert.throws(() => roundRm('1.00'), TypeError);
});
