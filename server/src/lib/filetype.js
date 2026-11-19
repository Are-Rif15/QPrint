/**
 * File type detection using magic bytes.
 *
 * Never trust the filename or the browser-supplied MIME type: both are easy to
 * fake. We look at the actual first bytes of the file instead.
 *
 * We also require the extension to match the detected type. That is not the
 * security check (the bytes are), but it catches renamed files with a clear
 * error message instead of converting them silently.
 */
import path from 'node:path';

const PDF_SIGNATURE = Buffer.from('%PDF-', 'ascii');
const JPEG_SIGNATURE = Buffer.from([0xff, 0xd8, 0xff]);
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const ZIP_SIGNATURE = Buffer.from([0x50, 0x4b, 0x03, 0x04]);

export const ACCEPTED_EXTENSIONS = ['.pdf', '.docx', '.jpg', '.jpeg', '.png'];

export function extensionOf(filename) {
  return path.extname(String(filename || '')).toLowerCase();
}

/**
 * Return 'pdf' | 'docx' | 'jpeg' | 'png', or null when the file is not one of
 * the accepted types.
 */
export function detectFileKind(buffer, originalName) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 8) return null;

  const extension = extensionOf(originalName);
  if (!ACCEPTED_EXTENSIONS.includes(extension)) return null;

  if (extension === '.pdf' && buffer.subarray(0, 5).equals(PDF_SIGNATURE)) {
    return 'pdf';
  }

  if (
    (extension === '.jpg' || extension === '.jpeg') &&
    buffer.subarray(0, 3).equals(JPEG_SIGNATURE)
  ) {
    return 'jpeg';
  }

  if (extension === '.png' && buffer.subarray(0, 8).equals(PNG_SIGNATURE)) {
    return 'png';
  }

  // .docx is a ZIP archive. A real Word file contains word/document.xml in its
  // (uncompressed) central directory, which we can find by scanning the bytes.
  if (
    extension === '.docx' &&
    buffer.subarray(0, 4).equals(ZIP_SIGNATURE) &&
    buffer.includes(Buffer.from('word/document.xml', 'utf8'))
  ) {
    return 'docx';
  }

  return null;
}
