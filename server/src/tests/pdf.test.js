import test from 'node:test';
import assert from 'node:assert/strict';
import { PDFDocument } from 'pdf-lib';
import { countPdfPages } from '../lib/pdf.js';

test('counts the pages of a generated PDF', async () => {
  const document = await PDFDocument.create();
  document.addPage();
  document.addPage();
  document.addPage();

  const bytes = await document.save();
  assert.equal(await countPdfPages(Buffer.from(bytes)), 3);
});

test('rejects damaged PDFs', async () => {
  await assert.rejects(() => countPdfPages(Buffer.from('not really a pdf')));
});
