import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canTransition,
  assertTransition,
  InvalidTransitionError,
  ORDER_STATUSES,
} from '../business/status.js';

test('the happy path is allowed end to end', () => {
  const steps = [
    ['pending_payment', 'pending_verification'],
    ['pending_verification', 'queued'],
    ['queued', 'printing'],
    ['printing', 'ready'],
    ['ready', 'collected'],
  ];

  for (const [from, to] of steps) {
    assert.equal(canTransition(from, to), true, `${from} -> ${to} should be allowed`);
  }
});

test('an order cannot skip steps', () => {
  assert.equal(canTransition('pending_payment', 'queued'), false);
  assert.equal(canTransition('pending_payment', 'printing'), false);
  assert.equal(canTransition('queued', 'ready'), false);
  assert.equal(canTransition('pending_verification', 'printing'), false);
});

test('payment rejection can go back to verification after re-upload', () => {
  assert.equal(canTransition('pending_verification', 'rejected'), true);
  assert.equal(canTransition('rejected', 'pending_verification'), true);
  assert.equal(canTransition('rejected', 'queued'), false);
});

test('a failed print job can return to the queue for a retry', () => {
  assert.equal(canTransition('printing', 'queued'), true);
});

test('students can only cancel before printing starts', () => {
  assert.equal(canTransition('pending_payment', 'cancelled'), true);
  assert.equal(canTransition('pending_verification', 'cancelled'), true);
  assert.equal(canTransition('ready', 'cancelled'), false);
  assert.equal(canTransition('collected', 'cancelled'), false);
});

test('terminal statuses allow no further changes', () => {
  assert.deepEqual(
    ['collected', 'cancelled'].flatMap((from) =>
      ORDER_STATUSES.filter((to) => canTransition(from, to)),
    ),
    [],
  );
});

test('unknown statuses are rejected', () => {
  assert.equal(canTransition('pending_payment', 'banana'), false);
  assert.equal(canTransition('banana', 'queued'), false);
});

test('assertTransition throws a typed error with details', () => {
  assert.doesNotThrow(() => assertTransition('queued', 'printing'));

  assert.throws(
    () => assertTransition('pending_payment', 'printing'),
    (err) => {
      assert.ok(err instanceof InvalidTransitionError);
      assert.equal(err.code, 'INVALID_STATUS_TRANSITION');
      assert.equal(err.from, 'pending_payment');
      assert.equal(err.to, 'printing');
      return true;
    },
  );
});
