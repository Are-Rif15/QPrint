import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeMalaysianPhone } from '../lib/phone.js';

test('accepts common Malaysian mobile formats', () => {
  assert.equal(normalizeMalaysianPhone('012-345 6789'), '0123456789');
  assert.equal(normalizeMalaysianPhone('0123456789'), '0123456789');
  assert.equal(normalizeMalaysianPhone('+60 12-345 6789'), '0123456789');
  assert.equal(normalizeMalaysianPhone('60123456789'), '0123456789');
});

test('accepts landline numbers', () => {
  assert.equal(normalizeMalaysianPhone('03 2233 4455'), '0322334455');
  assert.equal(normalizeMalaysianPhone('04-1234567'), '041234567');
});

test('rejects numbers that are too short, too long or not Malaysian', () => {
  assert.equal(normalizeMalaysianPhone('12345'), null);
  assert.equal(normalizeMalaysianPhone('1234567890123'), null);
  assert.equal(normalizeMalaysianPhone('+1 555 123 4567'), null);
  assert.equal(normalizeMalaysianPhone('not a phone'), null);
  assert.equal(normalizeMalaysianPhone(''), null);
  assert.equal(normalizeMalaysianPhone(null), null);
});
