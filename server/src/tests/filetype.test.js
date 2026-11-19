import test from 'node:test';
import assert from 'node:assert/strict';
import { detectFileKind } from '../lib/filetype.js';

test('detects PDFs by their signature', () => {
  const buffer = Buffer.concat([Buffer.from('%PDF-1.7\n'), Buffer.alloc(64)]);
  assert.equal(detectFileKind(buffer, 'notes.pdf'), 'pdf');
  assert.equal(detectFileKind(buffer, 'NOTES.PDF'), 'pdf');
});

test('detects JPEG and PNG images', () => {
  const jpeg = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(64)]);
  assert.equal(detectFileKind(jpeg, 'photo.jpg'), 'jpeg');
  assert.equal(detectFileKind(jpeg, 'photo.jpeg'), 'jpeg');

  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    Buffer.alloc(64),
  ]);
  assert.equal(detectFileKind(png, 'scan.png'), 'png');
});

test('detects DOCX only when it is a ZIP containing Word content', () => {
  const docx = Buffer.concat([
    Buffer.from([0x50, 0x4b, 0x03, 0x04]),
    Buffer.alloc(32, 0x20),
    Buffer.from('word/document.xml'),
  ]);
  assert.equal(detectFileKind(docx, 'essay.docx'), 'docx');
});

test('rejects files whose magic bytes do not match the extension', () => {
  const pdf = Buffer.concat([Buffer.from('%PDF-1.7\n'), Buffer.alloc(64)]);
  assert.equal(detectFileKind(pdf, 'pretend.png'), null);

  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    Buffer.alloc(64),
  ]);
  assert.equal(detectFileKind(png, 'pretend.pdf'), null);
});

test('rejects executables, empty buffers and unsupported extensions', () => {
  assert.equal(detectFileKind(Buffer.from('MZ\x90\x00' + ' '.repeat(64)), 'virus.exe'), null);
  assert.equal(detectFileKind(Buffer.alloc(0), 'empty.pdf'), null);
  assert.equal(detectFileKind(Buffer.from('hello world, not a document'), 'notes.txt'), null);
});

test('rejects a ZIP renamed to .docx when it has no Word content', () => {
  const zip = Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04]), Buffer.alloc(64)]);
  assert.equal(detectFileKind(zip, 'archive.docx'), null);
});
