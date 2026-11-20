import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canCancelOrder,
  canSubmitProof,
  paymentReference,
  proofExtension,
} from '../business/payments.js';

test('a proof may be sent before payment and after a rejection', () => {
  assert.equal(canSubmitProof('pending_payment'), true);
  assert.equal(canSubmitProof('rejected'), true);
});

test('a proof may not be sent while waiting or after printing starts', () => {
  for (const status of [
    'pending_verification',
    'queued',
    'printing',
    'ready',
    'collected',
    'cancelled',
  ]) {
    assert.equal(canSubmitProof(status), false, status);
  }
});

test('students can cancel only before payment is confirmed', () => {
  assert.equal(canCancelOrder('pending_payment'), true);
  assert.equal(canCancelOrder('rejected'), true);
  assert.equal(canCancelOrder('pending_verification'), false);
  assert.equal(canCancelOrder('queued'), false);
});

test('payment references are short, fixed width and readable', () => {
  assert.equal(paymentReference(1), 'QP-000001');
  assert.equal(paymentReference(42), 'QP-000042');
  assert.equal(paymentReference(1200000), 'QP-1200000');
  assert.throws(() => paymentReference(0), TypeError);
  assert.throws(() => paymentReference(1.5), TypeError);
  assert.throws(() => paymentReference('1'), TypeError);
});

test('proof extensions are canonical', () => {
  assert.equal(proofExtension('pdf'), '.pdf');
  assert.equal(proofExtension('jpeg'), '.jpg');
  assert.equal(proofExtension('png'), '.png');
  assert.throws(() => proofExtension('docx'), TypeError);
});
