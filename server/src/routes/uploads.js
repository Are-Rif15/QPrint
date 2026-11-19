/**
 * Temporary uploads.
 *
 * Flow:
 *   1. Student uploads one file -> we validate the real bytes, convert it to a
 *      PDF if needed, count pages and store it under a random name.
 *   2. The response includes a random token used to preview the PDF and to
 *      attach the file to an order later.
 *   3. When the order is created the upload is "claimed"; previews stop working
 *      so order pages can never be used to download documents.
 *
 * Nothing here is served from the public web root.
 */
import { Router } from 'express';
import multer from 'multer';
import fs from 'node:fs';
import path from 'node:path';
import { randomBytes, randomUUID } from 'node:crypto';
import { db } from '../db.js';
import { storagePaths } from '../lib/storage.js';
import { getSetting } from '../lib/settings.js';
import { detectFileKind, extensionOf } from '../lib/filetype.js';
import { countPdfPages } from '../lib/pdf.js';
import {
  convertToPdf,
  OfficeConversionError,
  OfficeNotAvailableError,
} from '../lib/office.js';

export const uploadsRouter = Router();

function maxUploadMb() {
  const configured = Number.parseFloat(getSetting('max_upload_mb', '10'));
  if (!Number.isFinite(configured) || configured <= 0) return 10;
  // Keep a hard ceiling so a bad setting cannot exhaust memory.
  return Math.min(Math.max(configured, 1), 50);
}

function maxUploadBytes() {
  return Math.round(maxUploadMb() * 1024 * 1024);
}

function shopIsOpen() {
  return getSetting('shop_open', 'true') === 'true';
}

/** Sanitise a display name: no folders, no absurd length. */
function displayName(originalName) {
  return path.basename(String(originalName || 'document')).slice(0, 200);
}

uploadsRouter.post('/', (req, res, next) => {
  if (!shopIsOpen()) {
    return res.status(403).json({ error: 'The shop is currently closed. Please try again later.' });
  }

  const limitBytes = maxUploadBytes();

  // The limit comes from the database, so a new multer instance is created for
  // each request instead of once at startup.
  const receiveFile = multer({
    storage: multer.memoryStorage(),
    limits: { files: 1, fileSize: limitBytes },
  }).single('file');

  receiveFile(req, res, (err) => {
    if (!err) return next();

    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({
          error: `That file is too large. The limit is ${maxUploadMb()} MB per file.`,
        });
      }
      return res.status(400).json({ error: 'Please upload one file at a time.' });
    }

    next(err);
  });
}, async (req, res, next) => {
  if (!req.file || !req.file.buffer?.length) {
    return res.status(400).json({ error: 'Choose a file to upload.' });
  }

  const originalName = displayName(req.file.originalname);
  const kind = detectFileKind(req.file.buffer, originalName);

  if (!kind) {
    return res.status(400).json({
      error:
        'That file type is not supported. Upload a PDF, Word document (.docx), JPG or PNG. ' +
        'The file contents must match its extension.',
    });
  }

  let pdfBytes;

  try {
    if (kind === 'pdf') {
      pdfBytes = req.file.buffer;
    } else {
      // DOCX and images go through LibreOffice (see lib/office.js).
      pdfBytes = await convertToPdf(req.file.buffer, extensionOf(originalName));
    }
  } catch (err) {
    if (err instanceof OfficeNotAvailableError) {
      return res.status(503).json({ error: err.message, code: err.code });
    }
    if (err instanceof OfficeConversionError) {
      return res.status(422).json({ error: err.message, code: err.code });
    }
    return next(err);
  }

  let pageCount;
  try {
    pageCount = await countPdfPages(pdfBytes);
  } catch {
    return res.status(422).json({
      error:
        'We could not read this document. It may be password-protected, damaged, or empty.',
    });
  }

  const token = randomBytes(24).toString('hex');
  const storedPath = path.join(storagePaths.documents, `${randomUUID()}.pdf`);

  try {
    fs.mkdirSync(storagePaths.documents, { recursive: true });
    fs.writeFileSync(storedPath, pdfBytes);

    db.prepare(
      `INSERT INTO uploads (token, original_name, stored_path, page_count, size_bytes)
       VALUES (?, ?, ?, ?, ?)`,
    ).run(token, originalName, storedPath, pageCount, req.file.size);
  } catch (err) {
    // Do not leave a half-stored file behind.
    fs.rmSync(storedPath, { force: true });
    return next(err);
  }

  return res.status(201).json({
    upload: {
      token,
      originalName,
      pageCount,
      sizeBytes: req.file.size,
      kind,
      previewUrl: `/api/uploads/${token}/preview`,
    },
  });
});

// Used by the "Remove" button before the order is placed.
uploadsRouter.delete('/:token', (req, res) => {
  const upload = db
    .prepare('SELECT id, stored_path, order_id FROM uploads WHERE token = ?')
    .get(req.params.token);

  if (!upload) {
    return res.status(404).json({ error: 'That file was not found.' });
  }

  if (upload.order_id) {
    return res.status(409).json({ error: 'This file is already part of an order.' });
  }

  fs.rmSync(upload.stored_path, { force: true });
  db.prepare('DELETE FROM uploads WHERE id = ?').run(upload.id);

  res.json({ ok: true });
});

// PDF.js fetches the converted PDF from here. The token keeps it private, and
// claimed uploads (already part of an order) can no longer be previewed.
uploadsRouter.get('/:token/preview', (req, res) => {
  const upload = db
    .prepare(
      `SELECT stored_path FROM uploads
       WHERE token = ? AND order_id IS NULL`,
    )
    .get(req.params.token);

  if (!upload) {
    return res.status(404).json({ error: 'This preview is no longer available.' });
  }

  if (!fs.existsSync(upload.stored_path)) {
    return res.status(410).json({ error: 'This file is no longer available. Please upload it again.' });
  }

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'inline; filename="preview.pdf"');
  res.setHeader('Cache-Control', 'no-store');
  fs.createReadStream(upload.stored_path).pipe(res);
});
