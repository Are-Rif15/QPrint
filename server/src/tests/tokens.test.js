import test from 'node:test';
import assert from 'node:assert/strict';
import { isPublicToken } from '../lib/tokens.js';

test('accepts 64 lowercase hex characters', () => {
  assert.equal(isPublicToken('a'.repeat(64)), true);
  assert.equal(isPublicToken('0123456789abcdef'.repeat(4)), true);
});

test('rejects tokens of the wrong shape', () => {
  assert.equal(isPublicToken('a'.repeat(63)), false);
  assert.equal(isPublicToken('a'.repeat(65)), false);
  assert.equal(isPublicToken('A'.repeat(64)), false);
  assert.equal(isPublicToken('g'.repeat(64)), false);
  assert.equal(isPublicToken('../../etc/passwd'), false);
  assert.equal(isPublicToken(null), false);
  assert.equal(isPublicToken(undefined), false);
});
