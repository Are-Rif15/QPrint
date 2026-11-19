/**
 * LibreOffice conversion for DOCX and images.
 *
 * The HP printer cannot print Word files or photos directly, so every upload
 * ends up as a PDF. `soffice --headless --convert-to pdf` does that conversion.
 *
 * If LibreOffice is not installed we throw a specific error so the API can tell
 * the owner exactly what to install instead of failing mysteriously.
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { config } from '../config.js';

const CONVERT_TIMEOUT_MS = 120_000;
const CONVERTIBLE_EXTENSIONS = ['.docx', '.jpg', '.jpeg', '.png'];

export class OfficeNotAvailableError extends Error {
  constructor() {
    super(
      'LibreOffice is not installed, so Word documents and images cannot be converted yet. ' +
        'Install it from https://www.libreoffice.org/download/ (or run "winget install TheDocumentFoundation.LibreOffice") ' +
        'and restart the server. If it is installed in a custom folder, set SOFFICE_PATH in .env.',
    );
    this.name = 'OfficeNotAvailableError';
    this.code = 'OFFICE_NOT_AVAILABLE';
  }
}

export class OfficeConversionError extends Error {
  constructor(message) {
    super(message);
    this.name = 'OfficeConversionError';
    this.code = 'OFFICE_CONVERSION_FAILED';
  }
}

/** All places LibreOffice may live on this machine. */
function candidatePaths() {
  const candidates = [];

  if (config.sofficePath) candidates.push(config.sofficePath);

  if (process.platform === 'win32') {
    candidates.push(
      'C:\\Program Files\\LibreOffice\\program\\soffice.exe',
      'C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe',
    );
    if (process.env.LOCALAPPDATA) {
      candidates.push(
        path.join(process.env.LOCALAPPDATA, 'Programs', 'LibreOffice', 'program', 'soffice.exe'),
      );
    }
  } else if (process.platform === 'darwin') {
    candidates.push('/Applications/LibreOffice.app/Contents/MacOS/soffice');
  } else {
    candidates.push(
      '/usr/bin/soffice',
      '/usr/local/bin/soffice',
      '/snap/bin/libreoffice',
      '/opt/libreoffice/program/soffice',
    );
  }

  // Also look through PATH, which covers package-manager installs.
  const executable = process.platform === 'win32' ? 'soffice.exe' : 'soffice';
  for (const dir of (process.env.PATH || '').split(path.delimiter)) {
    if (dir) candidates.push(path.join(dir, executable));
  }

  return candidates;
}

/** Return the soffice executable path, or null when it cannot be found. */
export function findSoffice() {
  for (const candidate of candidatePaths()) {
    try {
      if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
        return candidate;
      }
    } catch {
      // Ignore unreadable PATH entries and keep looking.
    }
  }
  return null;
}

export function isOfficeAvailable() {
  return findSoffice() !== null;
}

/**
 * Convert one uploaded file to PDF and return the PDF bytes.
 * `extension` must include the dot, e.g. '.docx'.
 */
export async function convertToPdf(inputBuffer, extension) {
  const soffice = findSoffice();
  if (!soffice) throw new OfficeNotAvailableError();

  if (!CONVERTIBLE_EXTENSIONS.includes(extension)) {
    throw new OfficeConversionError('This file type cannot be converted.');
  }

  // Use a fresh temp folder per conversion so simultaneous uploads do not
  // interfere with each other (LibreOffice normally locks its user profile).
  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'qprint-office-'));

  try {
    const inputPath = path.join(workDir, `document${extension}`);
    const outputDir = path.join(workDir, 'output');
    const profileDir = path.join(workDir, 'profile');
    fs.mkdirSync(outputDir);
    fs.mkdirSync(profileDir);
    fs.writeFileSync(inputPath, inputBuffer);

    await runSoffice(soffice, [
      '--headless',
      '--norestore',
      '--invisible',
      `-env:UserInstallation=${pathToFileURL(profileDir).href}`,
      '--convert-to',
      'pdf',
      '--outdir',
      outputDir,
      inputPath,
    ]);

    // LibreOffice writes the PDF using the input file's base name.
    const expected = path.join(outputDir, 'document.pdf');
    const outputPath = fs.existsSync(expected)
      ? expected
      : fs
          .readdirSync(outputDir)
          .filter((name) => name.toLowerCase().endsWith('.pdf'))
          .map((name) => path.join(outputDir, name))[0];

    if (!outputPath || !fs.existsSync(outputPath)) {
      throw new OfficeConversionError(
        'LibreOffice could not convert this file. It may be damaged or password-protected.',
      );
    }

    return fs.readFileSync(outputPath);
  } finally {
    fs.rmSync(workDir, { recursive: true, force: true });
  }
}

function runSoffice(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { windowsHide: true });
    let stderr = '';
    let settled = false;

    const finish = (fn, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      fn(value);
    };

    const timer = setTimeout(() => {
      child.kill();
      finish(
        reject,
        new OfficeConversionError(
          'LibreOffice took too long to convert this file. Try a smaller or simpler document.',
        ),
      );
    }, CONVERT_TIMEOUT_MS);

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
      if (stderr.length > 2000) stderr = stderr.slice(-2000);
    });

    child.on('error', (err) => {
      finish(reject, new OfficeConversionError(`Could not start LibreOffice: ${err.message}`));
    });

    child.on('close', (code) => {
      if (code === 0) {
        finish(resolve);
        return;
      }

      const detail = stderr.trim().split('\n')[0];
      finish(
        reject,
        new OfficeConversionError(
          `LibreOffice could not convert this file${detail ? `: ${detail}` : '.'}`,
        ),
      );
    });
  });
}
